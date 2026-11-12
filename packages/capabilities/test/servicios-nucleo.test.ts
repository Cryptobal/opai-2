import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  capacidadesDelNucleo,
  defineConsumidor,
  defineTrabajo,
  despacharPendientes,
  ejecutarTrabajos,
  executeCapability,
  limpiarConsumidores,
  limpiarRegistro,
  limpiarTrabajos,
  programarPeriodicos,
  registrarCapacidades,
  registrarConsumidores,
  registrarTrabajos,
} from "../src";
import { contextoDePrueba } from "../src/testing";
import { z } from "zod";

/** Cola en memoria sobre la tabla `trabajo` de la base falsa. */
function colaDe(tabla: (n: string) => Record<string, unknown>[]) {
  return {
    async reclamar(n: number) {
      const listos = tabla("trabajo").filter(
        (t) => t["estado"] === "pendiente" && (t["programadoPara"] as Date) <= new Date(),
      );
      return listos.slice(0, n).map((t) => {
        Object.assign(t, { estado: "en_curso", intentos: (t["intentos"] as number) + 1 });
        return {
          id: t["id"] as string,
          tipo: t["tipo"] as string,
          payload: t["payload"],
          intentos: t["intentos"] as number,
          maxIntentos: t["maxIntentos"] as number,
        };
      });
    },
    async completar(id: string) {
      Object.assign(tabla("trabajo").find((t) => t["id"] === id) ?? {}, { estado: "hecho" });
    },
    async fallar(id: string, error: string, reintentarEn: Date | null) {
      Object.assign(tabla("trabajo").find((t) => t["id"] === id) ?? {}, {
        estado: reintentarEn ? "pendiente" : "fallido",
        ultimoError: error,
        programadoPara: reintentarEn ?? new Date(),
      });
    },
    async devolver(id: string) {
      const t = tabla("trabajo").find((x) => x["id"] === id) ?? {};
      Object.assign(t, { estado: "pendiente", intentos: (t["intentos"] as number) - 1 });
    },
  };
}

beforeEach(() => {
  limpiarRegistro();
  limpiarConsumidores();
  limpiarTrabajos();
  registrarCapacidades(capacidadesDelNucleo);
});

describe("outbox de eventos", () => {
  it("entrega a cada consumidor una vez y reintenta solo al que falló", async () => {
    const vistos: string[] = [];
    let falla = true;
    registrarConsumidores([
      defineConsumidor({
        id: "a",
        descripcion: "a",
        eventos: "*",
        handler: async (_c, e) => void vistos.push(`a:${e.tipo}`),
      }),
      defineConsumidor({
        id: "b",
        descripcion: "b",
        eventos: ["core.cuenta.creada"],
        handler: async () => {
          if (falla) throw new Error("caído");
          vistos.push("b");
        },
      }),
    ]);
    const { ctx, tabla } = contextoDePrueba();
    await ctx.transaccion((tx) =>
      ctx.eventos.emitir(tx, { tipo: "core.cuenta.creada", entidadId: "c1" }),
    );
    expect(await despacharPendientes(ctx)).toMatchObject({ publicados: 0, errores: 1 });
    expect(tabla("evento")[0]).toMatchObject({ estado: "pendiente", intentos: 1 });
    falla = false;
    expect(await despacharPendientes(ctx)).toMatchObject({ publicados: 1, errores: 0 });
    expect(vistos).toEqual(["a:core.cuenta.creada", "b"]);
    expect(tabla("evento")[0]).toMatchObject({ estado: "publicado", actorTipo: "user" });
  });
});

describe("trabajos", () => {
  it("ejecuta, reintenta con espera y programa los diarios una sola vez", async () => {
    let n = 0;
    registrarTrabajos([
      defineTrabajo({
        tipo: "core.prueba.diaria",
        descripcion: "prueba",
        payload: z.object({ dia: z.string() }),
        periodicidad: "diaria",
        handler: async () => {
          n += 1;
          if (n === 1) throw new Error("primera vez falla");
          return { ok: true };
        },
      }),
    ]);
    const { ctx, tabla } = contextoDePrueba();
    expect(await programarPeriodicos(ctx, "2026-10-23")).toEqual(["core.prueba.diaria"]);
    expect(await programarPeriodicos(ctx, "2026-10-23")).toEqual([]);
    const cola = colaDe(tabla);
    expect(await ejecutarTrabajos(ctx, cola)).toMatchObject({ hechos: 0, fallidos: 1 });
    expect(tabla("trabajo")[0]).toMatchObject({
      estado: "pendiente",
      ultimoError: "primera vez falla",
    });
    Object.assign(tabla("trabajo")[0] ?? {}, { programadoPara: new Date(0) });
    expect(await ejecutarTrabajos(ctx, cola)).toMatchObject({ hechos: 1 });
  });

  it("un trabajo con tiempo propio termina aunque pase el límite general (CAR-273)", async () => {
    const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
    registrarTrabajos([
      defineTrabajo({ tipo: "core.prueba.lenta", descripcion: "prueba", payload: z.object({}).passthrough(), tiempoMaximoMs: 200, handler: async () => espera(80) }),
      defineTrabajo({ tipo: "core.prueba.corta", descripcion: "prueba", payload: z.object({}).passthrough(), handler: async () => espera(80) }),
    ]);
    const { ctx, tabla } = contextoDePrueba();
    await ctx.transaccion((tx) => ctx.trabajos.encolar(tx, { tipo: "core.prueba.lenta" }));
    await ctx.transaccion((tx) => ctx.trabajos.encolar(tx, { tipo: "core.prueba.corta" }));
    const r = await ejecutarTrabajos(ctx, colaDe(tabla), { timeoutMs: 40, hasta: Date.now() + 1_000 });
    expect(r).toMatchObject({ hechos: 1, fallidos: 1 });
    const porTipo = Object.fromEntries(tabla("trabajo").map((t) => [t["tipo"], t]));
    expect(porTipo["core.prueba.lenta"]).toMatchObject({ estado: "hecho" });
    expect(porTipo["core.prueba.corta"]).toMatchObject({ ultimoError: "Excedió 0.04 s." });
  });

  it("un trabajo que ya no alcanza a empezar vuelve a la cola sin gastar el intento (CAR-273)", async () => {
    registrarTrabajos([
      defineTrabajo({ tipo: "core.prueba.tarde", descripcion: "prueba", payload: z.object({}).passthrough(), tiempoMaximoMs: 30_000, handler: async () => ({ ok: true }) }),
    ]);
    const { ctx, tabla } = contextoDePrueba();
    await ctx.transaccion((tx) => ctx.trabajos.encolar(tx, { tipo: "core.prueba.tarde" }));
    // Pide 30 s y la vuelta entera dura 25 s: no hay vuelta que le alcance, así que corre con lo que queda.
    expect(await ejecutarTrabajos(ctx, colaDe(tabla), { timeoutMs: 20_000, hasta: Date.now() + 25_000 })).toMatchObject({ hechos: 1 });
    await ctx.transaccion((tx) => ctx.trabajos.encolar(tx, { tipo: "core.prueba.tarde", claveUnica: "otro" }));
    // Un lote que se reclamó con tiempo pero llega a este trabajo cuando ya no queda: vuelve sin gastar el intento.
    const cola = colaDe(tabla);
    const reclamar = cola.reclamar.bind(cola);
    cola.reclamar = async (n: number) => {
      const r = await reclamar(n);
      await new Promise((ok) => setTimeout(ok, 30));
      return r;
    };
    expect(await ejecutarTrabajos(ctx, cola, { timeoutMs: 20, hasta: Date.now() + 40 })).toMatchObject({ reclamados: 0, hechos: 0, fallidos: 0 });
    expect(tabla("trabajo").find((t) => t["claveUnica"] === "otro")).toMatchObject({ estado: "pendiente", intentos: 0 });
  });

  it("un trabajo largo no empieza con menos tiempo del que pide si una vuelta entera le alcanzaría (CAR-273)", async () => {
    registrarTrabajos([
      defineTrabajo({ tipo: "core.prueba.sii", descripcion: "prueba", payload: z.object({}).passthrough(), tiempoMaximoMs: 40_000, handler: async () => ({ ok: true }) }),
    ]);
    const { ctx, tabla } = contextoDePrueba();
    await ctx.transaccion((tx) => ctx.trabajos.encolar(tx, { tipo: "core.prueba.sii" }));
    const real = Date.now.bind(Date);
    let adelanto = 0;
    const reloj = vi.spyOn(Date, "now").mockImplementation(() => real() + adelanto);
    try {
      const cola = colaDe(tabla);
      const reclamar = cola.reclamar.bind(cola);
      cola.reclamar = async (n: number) => {
        const r = await reclamar(n);
        adelanto = 23_000; // Lo anterior del lote se comió 23 s: quedan 22, más que el general (20) pero menos que 40.
        return r;
      };
      expect(await ejecutarTrabajos(ctx, cola, { timeoutMs: 20_000, hasta: real() + 45_000 })).toMatchObject({ reclamados: 0, hechos: 0 });
    } finally {
      reloj.mockRestore();
    }
    expect(tabla("trabajo")[0]).toMatchObject({ estado: "pendiente", intentos: 0 });
  });

  it("un tipo desconocido falla sin reintento", async () => {
    const { ctx, tabla } = contextoDePrueba();
    await ctx.transaccion((tx) => ctx.trabajos.encolar(tx, { tipo: "core.no.existe" }));
    await ejecutarTrabajos(ctx, colaDe(tabla));
    expect(tabla("trabajo")[0]).toMatchObject({ estado: "fallido" });
  });
});

describe("bitácora y consumos", () => {
  it("encadena hechos y verifica; detecta una alteración", async () => {
    const { ctx, tabla } = contextoDePrueba();
    for (const i of [1, 2, 3]) {
      await ctx.transaccion((tx) => ctx.bitacora.registrar(tx, { tipo: "prueba", payload: { i } }));
    }
    expect(await executeCapability(ctx, "core.bitacora.verificar", {})).toMatchObject({
      ok: true,
      data: { ok: true, ultimoSeq: 3, primeraRota: null },
    });
    Object.assign(tabla("bitacora")[1] ?? {}, { payloadCanon: '{"alterado":true}' });
    expect(await ctx.bitacora.verificar()).toMatchObject({ ok: false, primeraRota: 2 });
  });

  it("encadena auditoría tras varias escrituras y detecta una alteración (ADR-052)", async () => {
    const { ctx, tabla } = contextoDePrueba({ permisos: ["core:audit.read"] });
    for (const texto of ["a", "b", "c"]) {
      await ctx.transaccion((tx) =>
        ctx.auditoria.registrar(tx, {
          tenantId: ctx.tenantId,
          capability: "test.nota.create",
          actor: ctx.actor,
          payload: { texto },
        }),
      );
    }
    expect(await ctx.auditoria.verificar()).toMatchObject({
      ok: true,
      ultimoSeq: 3,
      primeraRota: null,
    });
    const filas = tabla("auditEvent").filter((f) => f["capability"] === "test.nota.create");
    Object.assign(filas[1] ?? {}, { hashCanon: '{"alterado":true}' });
    expect(await ctx.auditoria.verificar()).toMatchObject({ ok: false, primeraRota: 2 });
  });

  it("resume consumos del mes por recurso y por agente", async () => {
    const ahora = new Date();
    const base = {
      tenantId: "t",
      modulo: "core",
      actorTipo: "agent",
      unidad: "x",
      createdAt: ahora,
    };
    const { ctx } = contextoDePrueba({
      semilla: {
        consumo: [
          {
            ...base,
            recurso: "capacidad.ejecucion",
            cantidad: 1,
            costoTotalMicro: 0,
            apiKeyId: "k1",
          },
          {
            ...base,
            recurso: "ia.estandar.salida",
            cantidad: 1000,
            costoTotalMicro: 15_000,
            apiKeyId: "k1",
          },
          { ...base, recurso: "correo.enviado", cantidad: 2, costoTotalMicro: 800, apiKeyId: null },
        ],
        apiKey: [{ id: "k1", nombre: "Grokbot" }],
      },
    });
    const r = await executeCapability(ctx, "core.consumos.resumen", {});
    expect(r).toMatchObject({ ok: true, data: { totalUsd: 0.02 } });
    const a = await executeCapability(ctx, "core.consumos.por_agente", {});
    expect(a).toMatchObject({
      ok: true,
      data: [{ apiKeyId: "k1", nombre: "Grokbot", ejecuciones: 1, costoUsd: 0.02 }],
    });
  });
});

describe("principal y portales (ADR-033)", () => {
  it("una key de cuenta cliente no ve capacidades solo del ERP", async () => {
    const { ctx } = contextoDePrueba({ principal: { tipo: "cuenta", id: "c1" } });
    const r = await executeCapability(ctx, "core.tenant.get", {});
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(r.ok === false && r.error.message).toMatch(/portal "cliente"/);
  });

  it("toda escritura real pide despachar el outbox; la vista previa no", async () => {
    const { ctx, despachos } = contextoDePrueba({
      semilla: {
        tenant: [
          {
            id: "0192f3a0-0000-7000-8000-000000000001",
            slug: "gard",
            nombre: "G",
            vertical: "seguridad",
            timezone: "America/Santiago",
            estado: "activo",
          },
        ],
      },
    });
    await executeCapability(ctx, "core.tenant.update", { nombre: "Gard" }, { dryRun: true });
    expect(despachos()).toBe(0);
    await executeCapability(ctx, "core.tenant.update", { nombre: "Gard" });
    expect(despachos()).toBe(1);
  });
});

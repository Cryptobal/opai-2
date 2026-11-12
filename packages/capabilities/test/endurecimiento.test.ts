// Revisión de la sesión A: transacción atómica en memoria, catálogo de eventos del núcleo, consumos
// por recurso, presupuesto del runner y cancelación de trabajos sin carreras.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import {
  capacidadesDelNucleo,
  defineTrabajo,
  ejecutarTrabajos,
  EVENTOS_CORE,
  executeCapability,
  limpiarRegistro,
  limpiarTrabajos,
  registrarCapacidades,
  registrarTrabajos,
} from "../src";
import { ejecutarHerramienta, herramientasMcp } from "../src/mcp";
import { contextoDePrueba } from "../src/testing";
import { semillaTenant } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  limpiarTrabajos();
  registrarCapacidades(capacidadesDelNucleo);
});

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? archivos(p) : p.endsWith(".ts") ? [p] : [];
  });
}

describe("transacción en memoria", () => {
  it("si el hecho falla, se revierten la escritura, el evento y el trabajo", async () => {
    const { ctx, tabla } = contextoDePrueba();
    await expect(
      ctx.transaccion(async (tx) => {
        await tx.cuenta.create({ data: { tenantId: ctx.tenantId, nombre: "X" } });
        await ctx.eventos.emitir(tx, { tipo: "core.cuenta.creada", payload: {} });
        await ctx.trabajos.encolar(tx, { tipo: "core.prueba" });
        throw new Error("falla");
      }),
    ).rejects.toThrow("falla");
    expect([tabla("cuenta").length, tabla("evento").length, tabla("trabajo").length]).toEqual([
      0, 0, 0,
    ]);
  });
});

describe("catálogo de eventos del núcleo", () => {
  it("todo evento core.* que el núcleo emite está declarado en EVENTOS_CORE", () => {
    const declarados = new Set(EVENTOS_CORE.map((e) => e.id));
    const emitidos = archivos(new URL("../src", import.meta.url).pathname)
      .flatMap((p) => [
        ...readFileSync(p, "utf8").matchAll(/emitir\(\s*tx,\s*\{\s*tipo: "(core\.[a-z_.]+)"/g),
      ])
      .map((m) => m[1] ?? "")
      .filter((t) => !t.startsWith("core.prueba"));
    expect(emitidos.length).toBeGreaterThan(0);
    expect(emitidos.filter((t) => !declarados.has(t))).toEqual([]);
  });
});

describe("consumos por recurso", () => {
  it("detalla un recurso por módulo y por agente", async () => {
    const base = { tenantId: "t", actorTipo: "agent", unidad: "correo", createdAt: new Date() };
    const { ctx } = contextoDePrueba({
      semilla: {
        consumo: [
          {
            ...base,
            recurso: "correo.enviado",
            modulo: "core",
            cantidad: 2,
            costoTotalMicro: 800,
            apiKeyId: "k1",
          },
          {
            ...base,
            recurso: "correo.enviado",
            modulo: "crm",
            cantidad: 1,
            costoTotalMicro: 400,
            apiKeyId: null,
          },
          {
            ...base,
            recurso: "geo.mapa",
            modulo: "core",
            cantidad: 1,
            costoTotalMicro: 2000,
            apiKeyId: null,
          },
        ],
      },
    });
    const r = await executeCapability(ctx, "core.consumos.por_recurso", {
      recurso: "correo.enviado",
    });
    expect(r).toMatchObject({
      ok: true,
      data: {
        cantidad: 3,
        porModulo: [
          { clave: "core", cantidad: 2, costoMicro: 800 },
          { clave: "crm", cantidad: 1, costoMicro: 400 },
        ],
        porAgente: [{ clave: "k1" }, { clave: "personas" }],
      },
    });
  });
});

describe("runner de trabajos", () => {
  it("corta por timeout un trabajo colgado y no reclama sin presupuesto de tiempo", async () => {
    registrarTrabajos([
      defineTrabajo({
        tipo: "core.prueba.lento",
        descripcion: "nunca termina",
        payload: z.object({}),
        handler: () => new Promise(() => undefined),
      }),
    ]);
    const { ctx } = contextoDePrueba();
    const fallos: (Date | null)[] = [];
    let entregados = false;
    const cola = {
      async reclamar() {
        if (entregados) return [];
        entregados = true;
        return [{ id: "1", tipo: "core.prueba.lento", payload: {}, intentos: 1, maxIntentos: 3 }];
      },
      completar: async () => undefined,
      fallar: async (_id: string, _e: string, r: Date | null) => void fallos.push(r),
      devolver: async () => undefined,
    };
    const r = await ejecutarTrabajos(ctx, cola, { timeoutMs: 20, hasta: Date.now() + 1000 });
    expect(r).toMatchObject({ reclamados: 1, fallidos: 1 });
    expect(fallos[0]).toBeInstanceOf(Date);
    const sinTiempo = await ejecutarTrabajos(ctx, cola, { hasta: Date.now() });
    expect(sinTiempo.reclamados).toBe(0);
  });
});

describe("platform.trabajos.cancelar", () => {
  it("no cancela un trabajo que un runner tomó entre la lectura y la escritura", async () => {
    const usuario = { id: "u", nombre: "P", email: "p@o.cl", platformRole: "owner" as const };
    const { ctx, tabla } = contextoDePrueba({ usuario, conTenant: false });
    const id = "0192f3a0-0000-7000-8000-0000000000f1";
    const tenantId = "0192f3a0-0000-7000-8000-000000000001";
    tabla("trabajo").push({
      id,
      tenantId,
      tipo: "x",
      estado: "pendiente",
      programadoPara: new Date(),
    });
    const original = ctx.db.trabajo.updateMany.bind(ctx.db.trabajo);
    Object.assign(ctx.db.trabajo, {
      updateMany: (a: Parameters<typeof original>[0]) => {
        Object.assign(tabla("trabajo")[0] ?? {}, { estado: "en_curso" });
        return original(a);
      },
    });
    const r = await executeCapability(ctx, "platform.trabajos.cancelar", {
      tenantId,
      trabajoId: id,
    });
    expect(r).toMatchObject({ ok: false });
    expect(tabla("trabajo")[0]?.["estado"]).toBe("en_curso");
  });
});

describe("idempotencia de escrituras", () => {
  it("la misma clave devuelve el resultado original sin repetir el efecto ni la auditoría", async () => {
    const { ctx, tabla, eventos } = contextoDePrueba({ semilla: semillaTenant() });
    const opciones = { idempotencyKey: "crear-key-1" };
    const datos = { nombre: "Agente cobranza", scopes: ["*"] };
    const a = await executeCapability(ctx, "core.apikeys.create", datos, opciones);
    const b = await executeCapability(ctx, "core.apikeys.create", datos, opciones);
    expect(a.ok && b.ok).toBe(true);
    expect(b).toMatchObject({ repetida: true, data: a.ok ? a.data : null });
    expect(tabla("apiKey")).toHaveLength(1);
    expect(eventos.filter((e) => e.capability === "core.apikeys.create")).toHaveLength(1);
    const otra = await executeCapability(
      ctx,
      "core.apikeys.create",
      { ...datos, nombre: "Otro" },
      opciones,
    );
    expect(otra).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("si la escritura falla, la clave queda libre para reintentar", async () => {
    const { ctx, tabla } = contextoDePrueba();
    const opciones = { idempotencyKey: "k-falla" };
    const r = await executeCapability(
      ctx,
      "core.apikeys.revoke",
      { id: "0192f3a0-0000-7000-8000-0000000000ff" },
      opciones,
    );
    expect(r.ok).toBe(false);
    expect(tabla("idempotencia")).toHaveLength(0);
  });

  it("por MCP, las escrituras aceptan idempotency_key y las vistas previas no", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semillaTenant() });
    const hs = herramientasMcp(ctx);
    const real = hs.find((h) => h.nombre === "core_apikeys_create");
    const previa = hs.find((h) => h.nombre === "preview_core_apikeys_create");
    if (!real || !previa) throw new Error("faltan herramientas");
    const props = (h: typeof real) =>
      Object.keys((z.toJSONSchema(h.input, { io: "input" }) as { properties: object }).properties);
    expect(props(real)).toContain("idempotency_key");
    expect(props(previa)).not.toContain("idempotency_key");
    const args = { nombre: "Agente MCP", scopes: ["*"], idempotency_key: "mcp-intento-001" };
    await ejecutarHerramienta(ctx, real, args);
    expect(await ejecutarHerramienta(ctx, real, args)).toMatchObject({ ok: true, repetida: true });
    expect(tabla("apiKey")).toHaveLength(1);
  });
});

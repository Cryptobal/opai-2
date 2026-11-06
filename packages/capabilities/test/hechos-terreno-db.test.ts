// CAR-78 · B3: hechos que el equipo de terreno envía en lote, contra Postgres real. Idempotencia, hora del
// servidor y desfase del reloj, lista blanca, equipo revocado, solo inserción y aislamiento entre empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Resultado = { clave: string; estado: string; motivo: string | null };
type Recepcion = {
  recibidoEn: string;
  desfaseSegundos: number;
  desfaseAlto: boolean;
  resultados: Resultado[];
};

describe.skipIf(!urlPropietario)("hechos de terreno en base real (CAR-78 B3)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const medidor = { registrar: async () => undefined };
  const t = { A: "", B: "" };
  const inst = { A: "", B: "" };
  const disp = { A: "", B: "", revocado: "" };
  let personaA = "";
  let personaB = "";

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      alcance: null,
      medidor,
    });
  const run = (tenant: string, id: string, input: unknown, o = {}) =>
    mod.executeCapability(ctx(tenant), id, input, o);
  const dato = async <T>(tenant: string, id: string, input: unknown, o = {}) => {
    const r = await run(tenant, id, input, o);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  };
  const latido = (extra: Record<string, unknown> = {}) => ({
    clave: randomUUID(),
    tipo: "terreno.latido",
    payload: { version: "terreno-web-1" },
    horaHecho: new Date(Date.now() - 60_000).toISOString(),
    ...extra,
  });
  const recibir = (
    dispositivoId: string,
    hechos: unknown[],
    horaEnvio = new Date().toISOString(),
    tenant = t.A,
  ) => run(tenant, "core.hechos_terreno.recibir", { dispositivoId, horaEnvio, hechos });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const sufijo = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `hch-${k.toLowerCase()}-${sufijo}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
      const cuenta = await dato<{ id: string }>(t[k], "core.cuentas.create", {
        nombre: `Cliente ${k}`,
      });
      inst[k] = (
        await dato<{ id: string }>(t[k], "core.instalaciones.create", {
          cuentaId: cuenta.id,
          nombre: `Planta ${k}`,
        })
      ).id;
    }
    const nuevoDisp = (tenantId: string, instalacionId: string, n: number, estado = "activo") =>
      e.admin.dispositivo.create({
        data: {
          tenantId,
          instalacionId,
          identificador: `DSP-000${n}`,
          estado,
          tokenHash: `h-${sufijo}-${tenantId}-${n}`,
        },
      });
    disp.A = (await nuevoDisp(t.A, inst.A, 1)).id;
    disp.B = (await nuevoDisp(t.B, inst.B, 1)).id;
    disp.revocado = (await nuevoDisp(t.A, inst.A, 2, "revocado")).id;
    const cargo = await e.admin.cargo.create({
      data: { tenantId: t.A, nombre: `Guardia ${sufijo}` },
    });
    const persona = (tenantId: string, rut: string, nombres: string) =>
      e.admin.persona.create({ data: { tenantId, rut, nombres, apellidos: "Prueba" } });
    personaA = (await persona(t.A, `1${sufijo.slice(0, 7)}-9`, "Ana")).id;
    personaB = (await persona(t.B, `2${sufijo.slice(0, 7)}-9`, "Beto")).id;
    await e.admin.vinculoLaboral.create({
      data: {
        tenantId: t.A,
        personaId: personaA,
        cargoId: cargo.id,
        tipo: "indefinido",
        instalacionId: inst.A,
        inicio: new Date("2026-01-01"),
      },
    });
  }, 120_000);

  afterAll(async () => {
    await e?.cerrar?.();
  });

  it("guarda el hecho una vez con la hora del servidor y corrige la hora con el desfase del equipo", async () => {
    // El equipo va 5 minutos atrasado: envía «ahora − 5 min» y capturó el hecho 1 minuto antes de enviar.
    const envio = new Date(Date.now() - 5 * 60_000);
    const hecho = latido({ horaHecho: new Date(envio.getTime() - 60_000).toISOString() });
    const r = await recibir(disp.A, [hecho], envio.toISOString());
    expect(r.ok).toBe(true);
    const d = (r as { data: Recepcion }).data;
    expect(d.resultados).toEqual([{ clave: hecho.clave, estado: "recibido", motivo: null }]);
    expect(Math.abs(d.desfaseSegundos - 300)).toBeLessThanOrEqual(5);
    expect(d.desfaseAlto).toBe(false);
    const fila = await e.admin.hechoTerreno.findFirstOrThrow({
      where: { tenantId: t.A, clave: hecho.clave },
    });
    expect(fila.instalacionId).toBe(inst.A);
    expect(fila.dispositivoId).toBe(disp.A);
    // Hora corregida ≈ hora del servidor menos 1 minuto (lo que pasó antes de enviar).
    expect(
      Math.abs(fila.horaCorregida.getTime() - (fila.recibidoEn.getTime() - 60_000)),
    ).toBeLessThan(5_000);
    expect(
      await e.admin.evento.count({
        where: { tenantId: t.A, tipo: "core.terreno.hechos_recibidos" },
      }),
    ).toBeGreaterThan(0);
  });

  it("marca el desfase alto pero guarda el hecho: un reloj malo no pierde un hecho", async () => {
    const envio = new Date(Date.now() - 30 * 60_000);
    const hecho = latido({ horaHecho: new Date(envio.getTime() - 1000).toISOString() });
    const d = ((await recibir(disp.A, [hecho], envio.toISOString())) as { data: Recepcion }).data;
    expect(d.desfaseAlto).toBe(true);
    const fila = await e.admin.hechoTerreno.findFirstOrThrow({
      where: { tenantId: t.A, clave: hecho.clave },
    });
    expect(fila.desfaseAlto).toBe(true);
  });

  it("reenviar el mismo lote no duplica: responde «duplicado» y la tabla queda con una fila", async () => {
    const hecho = latido();
    await recibir(disp.A, [hecho]);
    const otra = ((await recibir(disp.A, [hecho])) as { data: Recepcion }).data;
    expect(otra.resultados[0]).toEqual({ clave: hecho.clave, estado: "duplicado", motivo: null });
    expect(await e.admin.hechoTerreno.count({ where: { tenantId: t.A, clave: hecho.clave } })).toBe(
      1,
    );
  });

  it("dos envíos simultáneos del mismo hecho lo dejan pasar una sola vez", async () => {
    const hecho = latido();
    await Promise.all([recibir(disp.A, [hecho]), recibir(disp.A, [hecho])]);
    expect(await e.admin.hechoTerreno.count({ where: { tenantId: t.A, clave: hecho.clave } })).toBe(
      1,
    );
  });

  it("rechaza lo que no está en la lista blanca o no cumple su esquema, y el resto del lote sigue", async () => {
    const bueno = latido();
    const tipoAjeno = latido({ tipo: "asistencia.marca" });
    const payloadMalo = latido({ payload: { version: "x", ademas: 1 } });
    const posterior = latido({ horaHecho: new Date(Date.now() + 3_600_000).toISOString() });
    const antiguo = latido({ horaHecho: new Date(Date.now() - 20 * 24 * 3_600_000).toISOString() });
    const d = (
      (await recibir(disp.A, [bueno, tipoAjeno, payloadMalo, posterior, antiguo])) as {
        data: Recepcion;
      }
    ).data;
    expect(d.resultados.map((r) => [r.estado, r.motivo])).toEqual([
      ["recibido", null],
      ["rechazado", "tipo_no_permitido"],
      ["rechazado", "payload_invalido"],
      ["rechazado", "posterior_al_envio"],
      ["rechazado", "muy_antiguo"],
    ]);
    const claves = [tipoAjeno, payloadMalo, posterior, antiguo].map((h) => h.clave);
    expect(
      await e.admin.hechoTerreno.count({ where: { tenantId: t.A, clave: { in: claves } } }),
    ).toBe(0);
  });

  it("la vista previa valida el lote sin guardar nada", async () => {
    const hecho = latido();
    const r = await run(
      t.A,
      "core.hechos_terreno.recibir",
      { dispositivoId: disp.A, horaEnvio: new Date().toISOString(), hechos: [hecho] },
      { dryRun: true },
    );
    expect(r.ok && (r.data as Recepcion).resultados[0]?.estado).toBe("recibido");
    expect(await e.admin.hechoTerreno.count({ where: { tenantId: t.A, clave: hecho.clave } })).toBe(
      0,
    );
  });

  it("la persona elegida debe ser de la empresa: la de otra empresa o inexistente se rechaza", async () => {
    const propia = latido({ personaId: personaA });
    const ajena = latido({ personaId: personaB });
    const inexistente = latido({ personaId: randomUUID() });
    const d = ((await recibir(disp.A, [propia, ajena, inexistente])) as { data: Recepcion }).data;
    expect(d.resultados.map((r) => r.motivo)).toEqual([
      null,
      "persona_no_valida",
      "persona_no_valida",
    ]);
    expect(
      (await e.admin.hechoTerreno.findFirstOrThrow({ where: { clave: propia.clave } })).personaId,
    ).toBe(personaA);
  });

  it("un equipo revocado no escribe nada y el error lo dice", async () => {
    const hecho = latido();
    const r = await recibir(disp.revocado, [hecho]);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).toContain("revocado");
    expect(await e.admin.hechoTerreno.count({ where: { clave: hecho.clave } })).toBe(0);
  });

  it("«¿Quién eres?» lista a quienes tienen vínculo vigente en la instalación del equipo", async () => {
    const d = await dato<{
      instalacion: string;
      items: { id: string; nombre: string; iniciales: string; cargo: string | null }[];
    }>(t.A, "core.personas_terreno.listar", { dispositivoId: disp.A });
    expect(d.instalacion).toBe("Planta A");
    expect(d.items.map((p) => p.id)).toEqual([personaA]);
    expect(d.items[0]).toMatchObject({ nombre: "Ana Prueba", iniciales: "AP" });
    const sinNadie = await dato<{ items: unknown[] }>(t.B, "core.personas_terreno.listar", {
      dispositivoId: disp.B,
    });
    expect(sinNadie.items).toEqual([]);
  });

  it("dos empresas: un equipo de A no recibe con el contexto de B y B no ve los hechos de A", async () => {
    const hecho = latido();
    const cruzado = await recibir(disp.A, [hecho], new Date().toISOString(), t.B);
    expect(cruzado.ok).toBe(false);
    expect(await e.admin.hechoTerreno.count({ where: { clave: hecho.clave } })).toBe(0);
    await recibir(disp.A, [latido()]);
    const deB = await dato<{ items: unknown[] }>(t.B, "core.hechos_terreno.listar", {
      instalacionId: inst.B,
    });
    expect(deB.items).toEqual([]);
    const ajena = await run(t.B, "core.hechos_terreno.listar", { instalacionId: inst.A });
    expect(ajena.ok).toBe(false);
    const deA = await dato<{ items: { tipo: string }[] }>(t.A, "core.hechos_terreno.listar", {
      instalacionId: inst.A,
      limite: 5,
    });
    expect(deA.items.length).toBeGreaterThan(0);
    expect(deA.items.every((h) => h.tipo === "terreno.latido")).toBe(true);
  });

  it("es solo inserción para la app: editar o borrar un hecho falla por permisos", async () => {
    const hecho = latido();
    await recibir(disp.A, [hecho]);
    const fila = await e.admin.hechoTerreno.findFirstOrThrow({ where: { clave: hecho.clave } });
    const tenantDb = e.forTenant(t.A);
    await expect(
      tenantDb.hechoTerreno.update({ where: { id: fila.id }, data: { tipo: "otro" } }),
    ).rejects.toThrow(/permission denied|denied/i);
    await expect(tenantDb.hechoTerreno.delete({ where: { id: fila.id } })).rejects.toThrow(
      /permission denied|denied/i,
    );
  });
});

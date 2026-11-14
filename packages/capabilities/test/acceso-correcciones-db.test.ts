// CAR-477: anular, salida desde el ERP y cierre en bloque contra Postgres real (rol sin BYPASSRLS, dos empresas).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const CLAVE_PRUEBA = "clave-solo-para-pruebas-no-es-un-secreto-real-0123456789";
type K = "A" | "B";
type Pagina = {
  items: { id: string; nombre: string; anulado: boolean; salidaEn: string | null }[];
};

describe.skipIf(!urlPropietario)("correcciones de acceso en base real (CAR-477)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A: "", B: "" };
  const disp = { A: "", B: "" };
  const medidor = { registrar: async () => undefined };
  const ctx = (k: K, extra: Record<string, unknown> = {}) =>
    mod.crearContexto({
      tenantId: t[k],
      actor: { tipo: "system" },
      rol: "owner",
      alcance: null,
      medidor,
      modulosActivos: ["acceso"],
      ...extra,
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) =>
    mod.executeCapability(c, id, input, o);
  const ok = async <T>(c: ReturnType<typeof ctx>, id: string, input: unknown): Promise<T> => {
    const r = await run(c, id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  };
  async function entrada(k: K, nombre: string): Promise<string> {
    await ok(ctx(k), "core.hechos_terreno.recibir", {
      dispositivoId: disp[k],
      horaEnvio: new Date().toISOString(),
      hechos: [
        {
          clave: randomUUID(),
          tipo: "acceso.entrada",
          payload: {
            tipoRegistro: "visita",
            documento: { tipo: "run", numero: "12.345.678-5" },
            nombre,
          },
          horaHecho: new Date(Date.now() - 10_000).toISOString(),
        },
      ],
    });
    const p = await ok<Pagina>(ctx(k), "acceso.registros.listar", { q: nombre });
    const id = p.items[0]?.id;
    if (!id) throw new Error("registro de prueba");
    return id;
  }

  beforeAll(async () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", CLAVE_PRUEBA);
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarCapacidades(mod.capacidadesAcceso);
    const s = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `ac-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
      const cuentaId = (await e.admin.cuenta.create({ data: { tenantId: t[k], nombre: `C ${k}` } }))
        .id;
      inst[k] = (
        await e.admin.instalacion.create({
          data: { tenantId: t[k], cuentaId, nombre: `Portería ${k}` },
        })
      ).id;
      disp[k] = (
        await e.admin.dispositivo.create({
          data: {
            tenantId: t[k],
            instalacionId: inst[k],
            identificador: "DSP-1",
            estado: "activo",
            tokenHash: `h-${s}-${k}`,
          },
        })
      ).id;
    }
  }, 120_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await e?.cerrar?.();
  });

  it("salida desde el ERP: una sola, con origen erp; otra empresa no la registra", async () => {
    const id = await entrada("A", "Salida ERP");
    expect((await run(ctx("B"), "acceso.registros.salida", { id })).ok).toBe(false);
    await ok(ctx("A"), "acceso.registros.salida", { id, motivo: "No marcó en portería" });
    expect((await run(ctx("A"), "acceso.registros.salida", { id })).ok).toBe(false);
    const f = await ok<{ salidaOrigen: string }>(ctx("A"), "acceso.registros.get", { id });
    expect(f.salidaOrigen).toBe("erp");
  });

  it("anular deja un hecho nuevo: sale de «en sitio», no se anula dos veces y no se edita", async () => {
    const id = await entrada("A", "Para anular");
    const r = await ok<{ id: string }>(ctx("A"), "acceso.registros.anular", {
      id,
      motivo: "Registrado por error",
    });
    expect(r.id).toBe(id);
    const dentro = await ok<Pagina>(ctx("A"), "acceso.registros.listar", { soloEnSitio: true });
    expect(dentro.items.map((x) => x.id)).not.toContain(id);
    const todos = await ok<Pagina>(ctx("A"), "acceso.registros.listar", { q: "Para anular" });
    expect(todos.items[0]?.anulado).toBe(true);
    expect((await run(ctx("A"), "acceso.registros.anular", { id, motivo: "Otra vez" })).ok).toBe(
      false,
    );
    expect((await run(ctx("A"), "acceso.registros.salida", { id })).ok).toBe(false);
    await expect(
      e
        .forTenant(t.A)
        .anulacionAcceso.updateMany({ where: { registroId: id }, data: { motivo: "cambiado" } }),
    ).rejects.toThrow();
  });

  it("un agente necesita aprobación humana para anular y cerrar en bloque", async () => {
    const id = await entrada("A", "Agente");
    const sfx = randomUUID().slice(0, 8);
    const userId = (
      await e.admin.user.create({
        data: { name: "Agente", email: `ag-${sfx}@prueba.cl`, emailVerified: true },
      })
    ).id;
    const keyId = (
      await e.admin.apiKey.create({
        data: {
          tenantId: t.A,
          userId,
          nombre: "Agente",
          prefijo: `opai_ac_${sfx}`,
          hash: `h${sfx}`,
          scopes: ["*"],
        },
      })
    ).id;
    const agente = ctx("A", {
      actor: { tipo: "agent", id: keyId, viaUserId: userId },
      scopes: ["*"],
      agente: { apiKeyId: keyId, nombre: "Agente", presupuestoMensualMicro: null, autonomia: {} },
    });
    const r = await run(agente, "acceso.registros.anular", { id, motivo: "Prueba de agente" });
    expect(r.ok ? "ok" : r.error.code).toBe("APPROVAL_REQUIRED");
    const c = await run(agente, "acceso.registros.cerrar_bloque", {
      instalacionId: inst.A,
      motivo: "Cierre",
    });
    expect(c.ok ? "ok" : c.error.code).toBe("APPROVAL_REQUIRED");
  });

  it("cerrar en bloque: vista previa sin escribir, luego cierra a todos los abiertos de la instalación", async () => {
    await entrada("A", "Abierto uno");
    await entrada("B", "Ajeno");
    const previa = await run(
      ctx("A"),
      "acceso.registros.cerrar_bloque",
      { instalacionId: inst.A, motivo: "Fin del día" },
      { dryRun: true },
    );
    expect(previa.ok && (previa.data as { cerrados: number }).cerrados).toBeGreaterThan(0);
    const r = await ok<{ cerrados: number }>(ctx("A"), "acceso.registros.cerrar_bloque", {
      instalacionId: inst.A,
      motivo: "Fin del día",
    });
    expect(r.cerrados).toBeGreaterThan(0);
    expect(
      (await ok<Pagina>(ctx("A"), "acceso.registros.listar", { soloEnSitio: true })).items,
    ).toHaveLength(0);
    expect(
      (await ok<Pagina>(ctx("B"), "acceso.registros.listar", { soloEnSitio: true })).items,
    ).toHaveLength(1);
    expect(
      (
        await run(ctx("B"), "acceso.registros.cerrar_bloque", {
          instalacionId: inst.A,
          motivo: "x".repeat(5),
        })
      ).ok,
    ).toBe(false);
  });

  it("una salida del ERP sin equipo exige origen distinto de «dispositivo» (constraint de base)", async () => {
    const id = await entrada("A", "Constraint");
    await expect(
      e.forTenant(t.A).salidaAcceso.create({
        data: {
          tenantId: t.A,
          instalacionId: inst.A,
          registroId: id,
          clave: randomUUID(),
          horaCorregida: new Date(),
        },
      }),
    ).rejects.toThrow();
  });
});

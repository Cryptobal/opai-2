import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Mod from "../src";
import { sembrarLecturas, type FixtureLecturas } from "./lecturas-sensibles-fixture";

describe.skipIf(!urlPropietario)("core.buscar: agentes, permiso, alcance y auditoría", () => {
  let e: Entorno, mod: typeof Mod, a: FixtureLecturas, b: FixtureLecturas;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    a = await sembrarLecturas(e);
    b = await sembrarLecturas(e);
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  const contexto = (permisos: string[] | null = null) =>
    mod.crearContexto({
      tenantId: a.tenantId,
      actor: { tipo: "agent", id: a.apiKeyId, viaUserId: a.userId },
      rol: "owner",
      scopes: ["core"],
      claveApi: { servicio: false, permisos },
      medidor: { registrar: async () => undefined },
    });
  const ultimoEvento = () =>
    e.admin.auditEvent.findFirstOrThrow({
      where: { tenantId: a.tenantId, capability: "core.buscar" },
      orderBy: { seq: "desc" },
    });

  it("la key revela los mismos campos y audita solo IDs propios, nunca texto personal", async () => {
    const r = await mod.executeCapability(contexto(), "core.buscar", { q: "Lectura" });
    expect(r).toMatchObject({
      ok: true,
      data: {
        cuentas: [{ id: a.cuentaId, titulo: "Lectura cuenta", detalle: null }],
        personas: [{ id: a.personaId, titulo: "Lectura Persona", detalle: "12345678-5" }],
        contactos: [{ id: a.contactoId, detalle: "no-copiar@example.test" }],
      },
    });
    const evento = await ultimoEvento();
    expect(evento).toMatchObject({
      actorType: "agent",
      actorId: a.apiKeyId,
      viaUserId: a.userId,
      payload: { ids: [a.cuentaId, a.personaId, a.contactoId] },
    });
    for (const id of [b.cuentaId, b.personaId, b.contactoId])
      expect(JSON.stringify(r)).not.toContain(id);
  });

  it("sin permiso o sin alcance devuelve vacío y no audita IDs ocultos", async () => {
    for (const modo of ["permiso", "alcance", "key sin permisos"]) {
      let ctx = contexto();
      if (modo === "permiso") ctx.autorizar = () => false;
      else if (modo === "key sin permisos") {
        // Intersección real: la key no hereda los permisos owner del responsable.
        ctx = contexto([]);
      } else ctx.alcance = { instalaciones: [] };
      expect(await mod.executeCapability(ctx, "core.buscar", { q: "Lectura" })).toEqual({
        ok: true,
        dryRun: false,
        data: { cuentas: [], instalaciones: [], personas: [], contactos: [], otros: [] },
      });
      expect((await ultimoEvento()).payload).toEqual({ ids: [] });
    }
  });

  it("si falla el append de una key no revela resultados ni deja evento parcial", async () => {
    const ctx = contexto();
    const registrar = ctx.auditoria.registrar;
    const antes = await e.admin.auditEvent.count({ where: { tenantId: a.tenantId } });
    ctx.auditoria.registrar = async (tx, evento) => {
      await registrar(tx, evento);
      throw new Error("Fallo simulado");
    };
    expect(await mod.executeCapability(ctx, "core.buscar", { q: "Lectura" })).toMatchObject({
      ok: false,
      error: { code: "INTERNAL" },
    });
    expect(await e.admin.auditEvent.count({ where: { tenantId: a.tenantId } })).toBe(antes);
  });
});

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Capacidades from "../src";

describe.skipIf(!urlPropietario)("integridad del contenido y la cola de auditoría", () => {
  let e: Entorno;
  let mod: typeof Capacidades;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  const contexto = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });
  async function cadena() {
    const { id } = await e.admin.tenant.create({
      data: { slug: `aud-int-${randomUUID()}`, nombre: "Prueba", vertical: "seguridad" },
    });
    const ctx = contexto(id);
    for (const nombre of ["Una", "Dos", "Tres"])
      expect(await mod.executeCapability(ctx, "core.cuentas.create", { nombre })).toMatchObject({
        ok: true,
      });
    expect(await mod.executeCapability(ctx, "core.auditoria.verificar", {})).toMatchObject({
      data: { ok: true, ultimoSeq: 3 },
    });
    return {
      id,
      ctx,
      filas: await e.admin.auditEvent.findMany({
        where: { tenantId: id },
        orderBy: { seq: "asc" },
      }),
    };
  }

  it.each([
    { actorType: "user" },
    { actorId: "otro" },
    { viaUserId: "otro" },
    { capability: "core.otra" },
    { entityType: "otra" },
    { entityId: "otro" },
    { createdAt: new Date("2020-01-01T00:00:00Z") },
    { payload: { alterado: true } },
    { hashCanon: "alterado" },
    { hashAnterior: "alterado" },
    { hash: "alterado" },
  ])("detecta la alteración de %j", async (data) => {
    const { ctx, filas } = await cadena();
    await e.admin.auditEvent.update({ where: { id: filas[1]!.id }, data });
    expect(await mod.executeCapability(ctx, "core.auditoria.verificar", {})).toMatchObject({
      ok: true,
      data: { ok: false, primeraRota: 2 },
    });
  });

  it.each(["cola", "total"])("detecta borrado %s sin olvidar el máximo previo", async (tipo) => {
    const { id, ctx, filas } = await cadena();
    await e.admin.auditEvent.deleteMany({
      where: { tenantId: id, ...(tipo === "cola" ? { id: filas[2]!.id } : {}) },
    });
    for (let n = 0; n < 2; n++)
      expect(await mod.executeCapability(ctx, "core.auditoria.verificar", {})).toMatchObject({
        ok: true,
        data: { ok: false, primeraRota: tipo === "cola" ? 3 : 1 },
      });
    expect(
      await e.admin.auditoriaCabeza.findUniqueOrThrow({ where: { tenantId: id } }),
    ).toMatchObject({ ultimoSeq: 3, verificacionOk: false });
  });

  it("RLS no deja leer ni modificar la cabeza de otro tenant", async () => {
    const a = await cadena();
    const b = await cadena();
    expect(
      await e.forTenant(a.id).auditoriaCabeza.findUnique({ where: { tenantId: b.id } }),
    ).toBeNull();
    await expect(
      e
        .forTenant(a.id)
        .auditoriaCabeza.update({ where: { tenantId: b.id }, data: { ultimoSeq: 0 } }),
    ).rejects.toThrow();
  });
});

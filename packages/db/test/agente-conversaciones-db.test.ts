import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("conversaciones del agente: aislamiento por empresa", () => {
  let e: Entorno;
  let a: string;
  let b: string;
  const usuario = randomUUID();
  beforeAll(async () => {
    e = await prepararEntorno();
    await e.admin.user.create({
      data: {
        id: usuario,
        name: "Usuario ficticio compartido",
        email: `${usuario}@prueba.invalid`,
        emailVerified: true,
      },
    });
    const crear = async () =>
      (
        await e.admin.tenant.create({
          data: { slug: randomUUID(), nombre: "Empresa ficticia", vertical: "seguridad" },
        })
      ).id;
    a = await crear();
    b = await crear();
  });
  afterAll(async () => e?.cerrar());

  it("el mismo usuario en dos empresas tiene dos historiales que no se cruzan", async () => {
    const fila = await e.forTenant(a).agenteConversacion.create({
      data: { tenantId: a, userId: usuario, titulo: "Consulta ficticia", mensajes: [] },
    });
    expect(
      await e.forTenant(b).agenteConversacion.findUnique({ where: { id: fila.id } }),
    ).toBeNull();
    expect(
      (
        await e
          .forTenant(b)
          .agenteConversacion.updateMany({ where: { id: fila.id }, data: { titulo: "x" } })
      ).count,
    ).toBe(0);
    expect(
      (await e.forTenant(b).agenteConversacion.deleteMany({ where: { id: fila.id } })).count,
    ).toBe(0);
    await expect(
      e.forTenant(b).agenteConversacion.create({
        data: { tenantId: a, userId: usuario, titulo: "cruzada", mensajes: [] },
      }),
    ).rejects.toThrow();
    expect(await e.forTenant(a).agenteConversacion.count({ where: { userId: usuario } })).toBe(1);
    expect(await e.forTenant(b).agenteConversacion.count({ where: { userId: usuario } })).toBe(0);
  });
});

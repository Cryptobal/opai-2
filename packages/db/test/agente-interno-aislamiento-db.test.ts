import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)(
  "planes del agente: aislamiento de la reserva de confirmación",
  () => {
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
      for (const tenantId of [a, b])
        await e.admin.membership.create({
          data: { tenantId, userId: usuario, rol: "owner", portales: ["erp"] },
        });
    });
    afterAll(async () => e?.cerrar());
    it("el mismo usuario en dos empresas no lee ni altera una confirmación ajena", async () => {
      const fila = await e.forTenant(a).idempotencia.create({
        data: {
          tenantId: a,
          actor: `user:${usuario}`,
          clave: "plan:compartido:0",
          capability: "agente.plan.confirmar",
          huella: "ficticia",
          estado: "hecha",
          resultado: { estado: "rechazado" },
        },
      });
      expect(await e.forTenant(b).idempotencia.findUnique({ where: { id: fila.id } })).toBeNull();
      expect(
        (
          await e
            .forTenant(b)
            .idempotencia.updateMany({ where: { id: fila.id }, data: { estado: "en_curso" } })
        ).count,
      ).toBe(0);
      await expect(
        e.forTenant(b).idempotencia.create({
          data: {
            tenantId: a,
            actor: `user:${usuario}`,
            clave: "cruzada",
            capability: "agente.plan.confirmar",
            huella: "ficticia",
          },
        }),
      ).rejects.toThrow();
      const propia = await e.forTenant(b).idempotencia.create({
        data: {
          tenantId: b,
          actor: `user:${usuario}`,
          clave: "plan:compartido:0",
          capability: "agente.plan.confirmar",
          huella: "ficticia",
        },
      });
      expect(propia.tenantId).toBe(b);
    });
  },
);

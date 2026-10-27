// H15 (Revisor, PR #70): la key de servicio nunca supera los permisos efectivos ACTUALES de su
// responsable. Contra Postgres real: baja de rol y excepción leídas de las tablas reales, no en
// memoria.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { esRol } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("identidad de servicio: techo del responsable (H15)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let userId = "";
  let membershipId = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const s = randomUUID().slice(0, 8);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `h15-${s}`, nombre: "H15", vertical: "seguridad" },
      })
    ).id;
    userId = (
      await e.admin.user.create({
        data: { name: "Responsable", email: `resp-${s}@prueba.cl`, emailVerified: true },
      })
    ).id;
    membershipId = (
      await e.admin.membership.create({
        data: { tenantId, userId, rol: "gerente", portales: ["erp"] },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  /** Lee el rol y las excepciones VIGENTES del responsable, como hace `apps/web/lib/api-key.ts`. */
  async function accesoDelResponsable() {
    const m = await e
      .forTenant(tenantId)
      .membership.findUniqueOrThrow({ where: { id: membershipId } });
    if (!esRol(m.rol)) throw new Error(`Rol inesperado: ${m.rol}`);
    const excepciones = await e
      .forTenant(tenantId)
      .permisoExcepcion.findMany({ where: { membershipId } });
    return {
      rol: m.rol,
      permisosRol: null,
      excepciones: excepciones.map((x) => ({ permiso: x.permiso, conceder: x.conceder })),
    };
  }

  async function contextoKey(servicio: boolean) {
    const acceso = await accesoDelResponsable();
    return mod.crearContexto({
      tenantId,
      actor: { tipo: "agent", id: "key-h15", viaUserId: userId },
      usuario: { id: userId, nombre: "Responsable", email: "r@prueba.cl", platformRole: null },
      rol: servicio ? null : acceso.rol,
      claveApi: { servicio, permisos: ["core:instalaciones.manage"] },
      accesoResponsable: acceso,
      medidor: { registrar: async () => undefined },
    });
  }

  it.each([false, true])("baja a viewer se aplica a la key (servicio=%s)", async (servicio) => {
    const antes = await contextoKey(servicio);
    expect(antes.autorizar("core:instalaciones.manage")).toBe(true);
    await e.admin.membership.update({ where: { id: membershipId }, data: { rol: "viewer" } });
    const despues = await contextoKey(servicio);
    expect(despues.autorizar("core:instalaciones.manage")).toBe(false);
    await e.admin.membership.update({ where: { id: membershipId }, data: { rol: "gerente" } });
  });

  it("una excepción que deniega al responsable cierra ambas clases de key", async () => {
    await e.admin.permisoExcepcion.create({
      data: { tenantId, membershipId, permiso: "core:instalaciones.manage", conceder: false },
    });
    for (const servicio of [false, true]) {
      const ctx = await contextoKey(servicio);
      expect(ctx.autorizar("core:instalaciones.manage")).toBe(false);
    }
  });
});

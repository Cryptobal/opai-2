// Sesión de Octava (db): el token sobrevive al ROLLBACK de la cesión que falla (B1 del Revisor).
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";
import { almacenSesionOctava } from "../src/finanzas/adaptador-cesion-octava";

import type * as ModuloCapacidades from "../src";

describe.skipIf(omitirSuiteDb())("Finanzas · sesión de Octava (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenant = "";
  const ctx = () =>
    mod.crearContexto({
      tenantId: tenant,
      actor: { tipo: "system" },
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });

  beforeAll(async () => {
    process.env.OPAI_SECRETS_KEY = randomBytes(32).toString("base64");
    process.env.OPAI_SECRETS_KEY_VERSION = "97";
    delete process.env.OPAI_SECRETS_KEY_ANTERIOR;
    e = await prepararEntorno();
    mod = await import("../src");
    tenant = (await e.admin.tenant.create({ data: { slug: `oc-${randomUUID().slice(0, 8)}`, nombre: "Octava", vertical: "seguridad" } })).id;
    await e.admin.$executeRawUnsafe(
      `INSERT INTO core.integraciones (id, tenant_id, proveedor, modalidad, estado, updated_at) VALUES ($1::uuid, $2::uuid, 'dte_cesion', 'propia', 'activa', now())`,
      randomUUID(),
      tenant,
    );
  });

  afterAll(async () => {
    await e?.cerrar?.();
  });

  it("pide el token, la cesión falla y hace ROLLBACK: el token queda guardado", async () => {
    const c = ctx();
    const integ = await c.db.integracion.findUnique({ where: { tenantId_proveedor: { tenantId: tenant, proveedor: "dte_cesion" } } });
    expect(integ).not.toBeNull();
    // Igual que la cesión real: una escritura auditada, donde ctx.transaccion reutiliza la transacción de la solicitud.
    mod.limpiarRegistro();
    mod.registrarCapacidades([
      mod.defineCapability({
        id: "finanzas.prueba.sesion_octava_falla",
        descripcion: "Prueba: guarda el token de Octava y falla después, como una cesión que rechaza Octava.",
        permiso: null,
        interna: true,
        input: z.object({}),
        output: z.object({}),
        efecto: "escritura",
        dryRun: true,
        async handler(ctx2) {
          const almacen = almacenSesionOctava(ctx2, integ!.id);
          await almacen.guardarToken({ token: "TOKEN-A", expiraEn: Date.now() + 3_600_000 });
          throw new Error("CedeDte falló");
        },
      }),
    ]);
    const r = await mod.executeCapability(c, "finanzas.prueba.sesion_octava_falla", {});
    expect(r.ok).toBe(false);
    const almacen = almacenSesionOctava(ctx(), integ!.id);
    expect((await almacen.leerToken())?.token).toBe("TOKEN-A");
  });

  it("otra empresa no lee el token, y cambiar las credenciales descarta el token guardado", async () => {
    const c = ctx();
    const integ = await c.db.integracion.findUnique({ where: { tenantId_proveedor: { tenantId: tenant, proveedor: "dte_cesion" } } });
    const otro = (await e.admin.tenant.create({ data: { slug: `oc-${randomUUID().slice(0, 8)}`, nombre: "Otra", vertical: "seguridad" } })).id;
    const ctxOtro = mod.crearContexto({ tenantId: otro, actor: { tipo: "system" }, modulosActivos: ["finanzas"], medidor: { registrar: async () => undefined } });
    expect(await almacenSesionOctava(ctxOtro, integ!.id).leerToken()).toBeNull();

    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo.filter((x) => x.id === "core.integraciones.set_secreto"));
    const uid = (await e.admin.user.create({ data: { name: "U", email: `u-${randomUUID().slice(0, 8)}@x.cl`, emailVerified: true } })).id;
    await e.admin.membership.create({ data: { tenantId: tenant, userId: uid, rol: "owner", portales: ["erp"] } });
    const cu = mod.crearContexto({
      tenantId: tenant, rol: "owner", actor: { tipo: "user", id: uid }, portal: "erp", portalesMembresia: ["erp"],
      usuario: { id: uid, nombre: "U", email: "u@x.cl", platformRole: null },
      modulosActivos: ["finanzas"], medidor: { registrar: async () => undefined },
    });
    const r = await mod.executeCapability(cu, "core.integraciones.set_secreto", {
      proveedor: "dte_cesion", nombre: "clave", valor: "otra-clave-123",
    });
    expect(JSON.stringify(r)).toContain('"ok":true');
    expect(await almacenSesionOctava(ctx(), integ!.id).leerToken()).toBeNull();
  });
});

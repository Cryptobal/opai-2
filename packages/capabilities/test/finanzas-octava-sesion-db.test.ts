// Sesión de Octava (db): la PassAccesoApi y el token sobreviven al ROLLBACK de la cesión que falla (B1 del Revisor).
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

  it("registra al cedente, la cesión falla y hace ROLLBACK: la clave y el token quedan guardados", async () => {
    const c = ctx();
    const integ = await c.db.integracion.findUnique({ where: { tenantId_proveedor: { tenantId: tenant, proveedor: "dte_cesion" } } });
    expect(integ).not.toBeNull();
    // Igual que la cesión real: una escritura auditada, donde ctx.transaccion reutiliza la transacción de la solicitud.
    mod.limpiarRegistro();
    mod.registrarCapacidades([
      mod.defineCapability({
        id: "finanzas.prueba.sesion_octava_falla",
        descripcion: "Prueba: guarda la sesión de Octava y falla después, como una cesión que rechaza Octava.",
        permiso: null,
        interna: true,
        input: z.object({}),
        output: z.object({}),
        efecto: "escritura",
        dryRun: true,
        async handler(ctx2) {
          const almacen = almacenSesionOctava(ctx2, integ!.id);
          await almacen.guardarPassAcceso("PASS-ACCESO-1");
          await almacen.guardarToken({ token: "TOKEN-A", expiraEn: Date.now() + 3_600_000 });
          throw new Error("CedeDte falló");
        },
      }),
    ]);
    const r = await mod.executeCapability(c, "finanzas.prueba.sesion_octava_falla", {});
    expect(r.ok).toBe(false);
    const almacen = almacenSesionOctava(ctx(), integ!.id);
    expect(await almacen.leerPassAcceso()).toBe("PASS-ACCESO-1");
    expect((await almacen.leerToken())?.token).toBe("TOKEN-A");
  });
});

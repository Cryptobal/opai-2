// CAR-198 / CAR-220: los centros de costo para asignar son solo el general y las instalaciones ACTIVAS
// (ni prospectos ni inactivas ni archivadas), contra Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("Finanzas · centros de costo solo de instalaciones activas", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  const usuarioId = randomUUID();
  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin de prueba", email: "admin@prueba.cl", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas]);
    tenantId = (await e.admin.tenant.create({ data: { slug: `fin-cc-${randomUUID().slice(0, 8)}`, nombre: "Atlas Seguridad SpA", vertical: "seguridad" } })).id;
    const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cliente Norte" } })).id;
    for (const [nombre, estado] of [["Bodega Prospecto", "prospecto"], ["Bodega Activa", "activa"], ["Bodega Inactiva", "inactiva"]] as const) {
      await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre, estado } });
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("lista el general y solo la instalación activa", async () => {
    const r = await mod.executeCapability(ctx(), "finanzas.centros_costo.listar", {});
    if (!r.ok) throw new Error(r.error.message);
    const nombres = (r.data as { nombre: string }[]).map((c) => c.nombre);
    expect(nombres).toContain("Bodega Activa");
    expect(nombres).not.toContain("Bodega Prospecto");
    expect(nombres).not.toContain("Bodega Inactiva");
    expect(nombres).toHaveLength(2);
  });
});

// Brief 23 · Finanzas compras PR 1: aislamiento entre tenants contra Postgres real. La RLS
// `tenant_isolation` de `finanzas.*` y el trigger `mismo_tenant` impiden ver o referenciar datos de
// otra empresa, aun pasando el id directo.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("aislamiento entre tenants · Finanzas (RLS)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  let instB = "";
  let proveedorB = "";
  let documentoB = "";
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor,
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas]);
    const tenant = async (slug: string) =>
      (await e.admin.tenant.create({ data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" } })).id;
    tenantA = await tenant("fin-a");
    tenantB = await tenant("fin-b");
    const cuentaB = (await e.admin.cuenta.create({ data: { tenantId: tenantB, nombre: "Cuenta B" } })).id;
    instB = (await e.admin.instalacion.create({ data: { tenantId: tenantB, cuentaId: cuentaB, nombre: "Torre B" } })).id;
    proveedorB = (await e.admin.proveedor.create({ data: { tenantId: tenantB, rut: "76543210-3", razonSocial: "Proveedor B" } })).id;
    documentoB = (
      await e.admin.documentoRecibido.create({
        data: { tenantId: tenantB, proveedorId: proveedorB, tipoDte: 33, folio: 1, fechaEmision: new Date("2026-10-01"), fechaRecepcion: new Date("2026-10-01"), montoNeto: 100, montoIva: 19, montoTotal: 119 },
      })
    ).id;
    await e.admin.cuentaContable.create({ data: { tenantId: tenantB, codigo: "1.1.01", nombre: "Caja B", tipo: "activo", naturaleza: "deudora", grupo: "corriente" } });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("A no ve los proveedores, el libro ni el plan de B", async () => {
    const proveedores = await mod.executeCapability(ctx(tenantA), "finanzas.proveedores.listar", {});
    expect(proveedores.ok && (proveedores.data as { items: unknown[] }).items).toEqual([]);
    const libro = await mod.executeCapability(ctx(tenantA), "finanzas.compras.listar", {});
    expect(libro.ok && (libro.data as { items: unknown[] }).items).toEqual([]);
    const plan = await mod.executeCapability(ctx(tenantA), "finanzas.plan.listar", {});
    expect(plan.ok && (plan.data as { inicializado: boolean }).inicializado).toBe(false);
    const propio = await mod.executeCapability(ctx(tenantB), "finanzas.proveedores.listar", {});
    expect(propio.ok && (propio.data as { items: unknown[] }).items).toHaveLength(1);
  });

  it("A no abre la ficha del proveedor de B", async () => {
    const r = await mod.executeCapability(ctx(tenantA), "finanzas.proveedores.obtener", { id: proveedorB });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("A no registra un documento contra el proveedor de B ni lo asigna a un centro de B", async () => {
    const reg = await mod.executeCapability(ctx(tenantA), "finanzas.compras.registrar", {
      proveedorId: proveedorB, tipoDte: 33, folio: 9, fechaEmision: "2026-10-02", montoNeto: 100, montoIva: 19,
    });
    expect(reg).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const asignar = await mod.executeCapability(ctx(tenantA), "finanzas.compras.asignar_centro", {
      documentoIds: [documentoB], centro: { tipo: "general" },
    });
    expect(asignar).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const ajena = await mod.executeCapability(ctx(tenantA), "finanzas.proveedores.crear", {
      rut: "77123456-9", razonSocial: "Con instalación ajena", centro: { tipo: "instalacion", instalacionId: instB },
    });
    expect(ajena).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("el trigger mismo_tenant rechaza una referencia cruzada aunque se salte la capacidad", async () => {
    await expect(
      e.admin.documentoRecibido.create({
        data: { tenantId: tenantA, proveedorId: proveedorB, tipoDte: 33, folio: 77, fechaEmision: new Date("2026-10-01"), fechaRecepcion: new Date("2026-10-01"), montoTotal: 0 },
      }),
    ).rejects.toThrow();
    await expect(
      e.admin.centroCosto.create({ data: { tenantId: tenantA, tipo: "instalacion", instalacionId: instB, nombre: "Ajeno" } }),
    ).rejects.toThrow();
  });

  it("sin tenant fijado el rol de aplicación no ve ninguna fila de finanzas", async () => {
    expect(await e.appSinTenant.proveedor.count()).toBe(0);
    expect(await e.appSinTenant.documentoRecibido.count()).toBe(0);
    expect(await e.appSinTenant.cuentaContable.count()).toBe(0);
    expect(await e.appSinTenant.centroCosto.count()).toBe(0);
  });
});

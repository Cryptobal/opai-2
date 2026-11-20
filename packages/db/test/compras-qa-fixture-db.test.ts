import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { sembrarComprasQa } from "../scripts/compras-qa-fixture";
import { COMPRAS_QA } from "../../testing/src/compras-qa";
import { crearComprasQaAislada } from "./compras-qa-aislada";

const plantilla = process.env.COMPRAS_QA_TEMPLATE_URL;

// En CI la falta de servicio es un fallo, no una omisión.
describe.skipIf(!plantilla && !process.env.CI)("fixture de compras aislada", () => {
  let e: Awaited<ReturnType<typeof crearComprasQaAislada>>;
  let cerrar: (() => Promise<void>) | undefined;
  beforeEach(async () => {
    if (!plantilla) throw new Error("Falta el servicio de CI dedicado a compras.");
    e = await crearComprasQaAislada(plantilla);
    cerrar = e.cerrar;
  });
  afterEach(async () => {
    const limpiar = cerrar;
    cerrar = undefined;
    await limpiar?.();
  });

  async function prepararBaseline() {
    await e.admin.tenant.create({
      data: {
        slug: "qa-e2e",
        nombre: "Empresa ficticia QA compras",
        vertical: "seguridad",
        estado: "activo",
      },
    });
    await sembrarComprasQa(e.url);
  }

  it("falla cerrado, no pisa colisiones y crea solo el conjunto sintético completo", async () => {
    const url = e.url;
    await expect(sembrarComprasQa(url)).rejects.toThrow("Falta qa-e2e activo");
    const tenant = await e.admin.tenant.create({
      data: {
        slug: "qa-e2e",
        nombre: "Empresa ficticia QA compras",
        vertical: "seguridad",
        estado: "suspendido",
      },
    });
    await expect(sembrarComprasQa(url)).rejects.toThrow("Falta qa-e2e activo");
    await e.admin.tenant.update({ where: { id: tenant.id }, data: { estado: "activo" } });
    const cuenta = await e.admin.cuentaBancaria.create({
      data: {
        id: COMPRAS_QA.cuenta,
        tenantId: tenant.id,
        banco: "Colisión ficticia QA",
        numeroVisible: "NO-ES-CUENTA",
      },
    });
    await expect(sembrarComprasQa(url)).rejects.toThrow("Colisión");
    expect(await e.admin.proveedor.count({ where: { tenantId: tenant.id } })).toBe(0);
    expect(await e.admin.documentoRecibido.count({ where: { tenantId: tenant.id } })).toBe(0);
    expect(await e.admin.cuentaBancaria.findUnique({ where: { id: cuenta.id } })).toMatchObject({
      banco: cuenta.banco,
    });
    await e.admin.cuentaBancaria.delete({ where: { id: cuenta.id } });
    const resultados = await Promise.allSettled([sembrarComprasQa(url), sembrarComprasQa(url)]);
    expect(resultados.some((r) => r.status === "fulfilled")).toBe(true);
    for (const r of resultados) {
      if (r.status === "rejected") expect(["P2002", "P2034"]).toContain(r.reason.code);
    }
    expect(await e.admin.documentoRecibido.count({ where: { tenantId: tenant.id } })).toBe(2);
    expect(await e.admin.proveedor.count({ where: { tenantId: tenant.id } })).toBe(1);
    expect(await e.admin.cuentaBancaria.count({ where: { tenantId: tenant.id } })).toBe(1);
    expect(await e.admin.movimientoBancario.count({ where: { tenantId: tenant.id } })).toBe(1);
    expect(
      await e.admin.conciliacionBanco.findMany({ where: { tenantId: tenant.id } }),
    ).toMatchObject([{ enlaceId: COMPRAS_QA.pagada, monto: 119n, activa: true, confirmada: true }]);
    await expect(sembrarComprasQa(url)).resolves.toBeUndefined();
    expect(await e.admin.documentoRecibido.count({ where: { tenantId: tenant.id } })).toBe(2);
  });
  async function conjunto() {
    return Promise.all([
      e.admin.proveedor.findMany({ orderBy: { id: "asc" } }),
      e.admin.cuentaBancaria.findMany({ orderBy: { id: "asc" } }),
      e.admin.documentoRecibido.findMany({ orderBy: { id: "asc" } }),
      e.admin.movimientoBancario.findMany({ orderBy: { id: "asc" } }),
      e.admin.conciliacionBanco.findMany({ orderBy: { id: "asc" } }),
    ]);
  }

  it("repite sin escribir ni cambiar timestamps en ninguna fila", async () => {
    await prepararBaseline();
    const antes = await conjunto();
    await sembrarComprasQa(e.url);
    await sembrarComprasQa(e.url);
    expect(await conjunto()).toEqual(antes);
  });

  it("rechaza un conjunto alterado, sin repararlo", async () => {
    await prepararBaseline();
    await e.admin.documentoRecibido.update({
      where: { id: COMPRAS_QA.pagada },
      data: { montoNeto: 101, montoTotal: 120 },
    });
    const antes = await conjunto();
    await expect(sembrarComprasQa(e.url)).rejects.toThrow("Colisión");
    expect(await conjunto()).toEqual(antes);
    await e.admin.documentoRecibido.update({
      where: { id: COMPRAS_QA.pagada },
      data: { montoNeto: 100, montoTotal: 119 },
    });
  });

  it("rechaza enlaces adicionales y conjuntos parciales sin sobrescribir", async () => {
    await prepararBaseline();
    const original = await e.admin.conciliacionBanco.findUniqueOrThrow({
      where: { id: COMPRAS_QA.conciliacion },
    });
    const extra = await e.admin.conciliacionBanco.create({
      data: {
        tenantId: original.tenantId,
        movimientoId: original.movimientoId,
        tipoEnlace: original.tipoEnlace,
        enlaceId: COMPRAS_QA.pendiente,
        monto: 1n,
      },
    });
    const antes = await conjunto();
    await expect(sembrarComprasQa(e.url)).rejects.toThrow("Colisión");
    expect(await conjunto()).toEqual(antes);
    await e.admin.conciliacionBanco.delete({ where: { id: extra.id } });
    await e.admin.conciliacionBanco.delete({ where: { id: original.id } });
    const parcial = await conjunto();
    await expect(sembrarComprasQa(e.url)).rejects.toThrow("Colisión");
    expect(await conjunto()).toEqual(parcial);
  });
});

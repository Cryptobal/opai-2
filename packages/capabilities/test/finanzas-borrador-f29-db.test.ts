// CAR-173 · Borrador del F29: IVA débito − crédito del mes, compras reclamadas fuera, PPM con la tasa de la empresa,
// remanente cuando el crédito supera al débito y aislamiento entre empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/finanzas/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);

type F29 = {
  ventas: { documentos: number; neto: number; exento: number; iva: number };
  compras: { documentos: number; iva: number; pendientesRevision: number; reclamados: number };
  debito: number;
  credito: number;
  remanenteAnterior: number;
  ivaAPagar: number;
  remanenteMes: number;
  ppm: number;
  totalAPagar: number;
  fechaPago: string;
  ivaPostergado: boolean;
};

describe.skipIf(omitirSuiteDb())("finanzas · borrador del F29 (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  const usuario = randomUUID();
  const ctx = (tid: string) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@f29.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  async function f29(tid: string, periodo: string): Promise<F29> {
    const r = await mod.executeCapability(ctx(tid), "finanzas.impuestos.borrador_f29", { periodo });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as F29;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarModulos([manifest]);
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    tenantA = (await e.admin.tenant.create({ data: { slug: `f29-a-${randomUUID().slice(0, 8)}`, nombre: "A", vertical: "seguridad" } })).id;
    tenantB = (await e.admin.tenant.create({ data: { slug: `f29-b-${randomUUID().slice(0, 8)}`, nombre: "B", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${randomUUID().slice(0, 8)}@f29.test`, name: "u" } });
    const cliente = (await e.admin.cuenta.create({ data: { tenantId: tenantA, nombre: "Cliente", rut: "76333333-3" } })).id;
    const prov = (await e.admin.proveedor.create({ data: { tenantId: tenantA, razonSocial: "Proveedor", rut: "76444444-4" } })).id;
    const r = await mod.executeCapability(ctx(tenantA), "core.config.set", { modulo: "finanzas", clave: "flujo_tasa_ppm_bps", valor: 100 });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    const venta = (folio: number, tipoDte: number, neto: number, iva: number, estadoDte: string, dia = "2026-09-10") =>
      e.admin.documentoEmitido.create({
        data: { tenantId: tenantA, cuentaId: cliente, tipoDte, folio, fechaEmision: fecha(dia), fechaVencimiento: fecha(dia), montoNeto: neto, montoIva: iva, montoTotal: neto + iva, estadoDte },
      });
    // Septiembre: dos facturas (IVA 190.000), una NC (−19.000), un borrador que no cuenta y una factura de octubre.
    await venta(1, 33, 600_000, 114_000, "aceptado");
    await venta(2, 33, 400_000, 76_000, "enviado");
    await venta(3, 61, 100_000, 19_000, "aceptado");
    await venta(4, 33, 999_000, 189_810, "borrador");
    await venta(5, 33, 50_000, 9_500, "aceptado", "2026-10-02");
    const compra = (folio: number, iva: number, estadoRecepcion: string, dia = "2026-09-15") =>
      e.admin.documentoRecibido.create({
        data: { tenantId: tenantA, proveedorId: prov, tipoDte: 33, folio, fechaEmision: fecha(dia), fechaRecepcion: fecha(dia), montoNeto: Math.round(iva / 0.19), montoIva: iva, montoTotal: Math.round(iva / 0.19) + iva, estadoRecepcion },
      });
    // Septiembre: crédito 76.000 (una aceptada y una pendiente) y una reclamada fuera. Octubre: crédito mayor al débito.
    await compra(11, 57_000, "aceptado");
    await compra(12, 19_000, "pendiente_revision");
    await compra(13, 38_000, "reclamado");
    await compra(14, 19_000, "aceptado", "2026-10-05");
  }, 120_000);

  afterAll(async () => {
    await e?.cerrar();
  });

  it("débito − crédito del mes, sin borradores ni reclamadas, con PPM y fecha de pago", async () => {
    const r = await f29(tenantA, "2026-09");
    expect(r.ventas).toMatchObject({ documentos: 3, neto: 900_000, iva: 171_000 });
    expect(r.compras).toMatchObject({ documentos: 2, iva: 76_000, pendientesRevision: 1, reclamados: 1 });
    expect(r).toMatchObject({ debito: 171_000, credito: 76_000, ivaAPagar: 95_000, remanenteMes: 0, ppm: 9_000, totalAPagar: 104_000 });
    expect(r.fechaPago).toBe("2026-10-20");
    expect(r.ivaPostergado).toBe(false);
  });

  it("si el crédito supera al débito queda remanente y no hay IVA a pagar", async () => {
    const r = await f29(tenantA, "2026-10");
    expect(r).toMatchObject({ debito: 9_500, credito: 19_000, remanenteAnterior: 0, ivaAPagar: 0, remanenteMes: 9_500 });
  });

  it("el remanente se arrastra al mes siguiente y se descuenta del IVA a pagar", async () => {
    const r = await f29(tenantA, "2026-11");
    expect(r).toMatchObject({ debito: 0, credito: 0, remanenteAnterior: 9_500, ivaAPagar: 0, remanenteMes: 9_500 });
  });

  it("otra empresa ve su F29 en cero", async () => {
    const r = await f29(tenantB, "2026-09");
    expect(r).toMatchObject({ debito: 0, credito: 0, ivaAPagar: 0, ppm: 0 });
    expect(r.ventas.documentos).toBe(0);
  });
});

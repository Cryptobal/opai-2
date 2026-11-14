// CAR-490: el pago de una factura vencida, emitida hace más de 15 días, se sugiere al conciliar el abono.
// Datos ficticios contra Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { urlPropietario } from "../../db/test/entorno";

import { registrarModuloFinanzas } from "./finanzas-modulo";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

type Sugerencias = { sugerencias: { documentoId: string; confianza: number; motivo: string }[] };

const diasAtras = (n: number): Date => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

describe.skipIf(!urlPropietario)("Finanzas · conciliación de facturas vencidas (db)", () => {
  let s: VentasDbSuite;
  let cuentaBanco = "";

  const factura = (folio: number, monto: number, emitidaHace: number, estadoCobro = "pendiente", extra: Record<string, unknown> = {}) =>
    s.e.admin.documentoEmitido.create({
      data: {
        ...extra,
        tenantId: s.tenantId, cuentaId: s.cuentaId, tipoDte: 33, folio, estadoDte: "aceptado", estadoCobro,
        fechaEmision: diasAtras(emitidaHace), fechaVencimiento: diasAtras(emitidaHace - 30), montoNeto: monto, montoTotal: monto,
      },
    });
  const abono = (monto: number) =>
    s.e.admin.movimientoBancario.create({
      data: {
        tenantId: s.tenantId, cuentaId: cuentaBanco, fecha: diasAtras(0), monto: BigInt(monto), glosa: "Transferencia recibida",
        claveDedupe: `a-${randomUUID()}`, origen: "cartola",
      },
    });
  const sugerir = async (monto: number) => {
    const mov = await abono(monto);
    return s.dato<Sugerencias>("finanzas.conciliaciones.sugerir", { movimientoId: mov.id });
  };

  beforeAll(async () => {
    s = await prepararVentasDb();
    s.mod.limpiarRegistro();
    s.mod.registrarCapacidades([...s.mod.capacidadesDelNucleo, ...s.mod.capacidadesFinanzas, ...capacidades]);
    registrarModuloFinanzas();
    cuentaBanco = (await s.dato<{ id: string }>("finanzas.bancos.guardar", { banco: "Santander", numeroVisible: "222333444" })).id;
  });

  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("una factura emitida hace 40 días, vencida y sin pagar, se sugiere con monto único", async () => {
    const f = await factura(9301, 595_000, 40);
    const r = await sugerir(595_000);
    expect(r.sugerencias).toHaveLength(1);
    expect(r.sugerencias[0]).toMatchObject({ documentoId: f.id, confianza: 0.7 });
  });

  it("una factura ya pagada de hace 40 días no se sugiere", async () => {
    await factura(9302, 333_000, 40, "pagada");
    expect((await sugerir(333_000)).sugerencias).toHaveLength(0);
  });

  it("dos facturas abiertas con el mismo monto se sugieren ambas, sin confianza de monto único", async () => {
    await factura(9303, 444_000, 50);
    await factura(9304, 444_000, 20);
    const r = await sugerir(444_000);
    expect(r.sugerencias).toHaveLength(2);
    expect(r.sugerencias.every((x) => x.confianza === 0.5)).toBe(true);
  });

  it("una factura abierta de hace más de un año queda fuera", async () => {
    await factura(9305, 777_000, 400);
    expect((await sugerir(777_000)).sugerencias).toHaveLength(0);
  });

  it("una pagada en parte de hace 40 días se sugiere por su saldo; una cedida no", async () => {
    const parcial = await factura(9306, 900_000, 40, "pagada_parcial", { montoCobrado: 400_000 });
    const r = await sugerir(500_000);
    expect(r.sugerencias).toMatchObject([{ documentoId: parcial.id }]);
    await factura(9307, 888_000, 40, "pendiente", { cesionEstado: "cedido" });
    expect((await sugerir(888_000)).sugerencias).toHaveLength(0);
  });
});

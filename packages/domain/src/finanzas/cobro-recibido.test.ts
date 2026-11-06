import { describe, expect, it } from "vitest";

import { emparejarAbonosConCobros } from "./cobro-recibido";

const abono = (id: string, monto: number, glosa: string) => ({ id, monto, glosa });
const cobro = (id: string, monto: number, rut: string | null) => ({ id, monto, rut });

describe("emparejarAbonosConCobros", () => {
  it("monto exacto y RUT de la glosa igual al del cliente: coincidencia segura", () => {
    const r = emparejarAbonosConCobros({
      abonos: [abono("a1", 500_000, "TRANSF DE 76.123.456-0 FACTURA")],
      cobros: [cobro("f1", 500_000, "76123456-0")],
    });
    expect([...r.seguros.entries()]).toEqual([["f1", "a1"]]);
    expect(r.posibles).toEqual([]);
  });
  it("monto exacto pero sin RUT o con otro RUT: posible, la proyección se mantiene", () => {
    const sinRut = emparejarAbonosConCobros({ abonos: [abono("a1", 500_000, "Transferencia recibida")], cobros: [cobro("f1", 500_000, "76123456-0")] });
    expect(sinRut.seguros.size).toBe(0);
    expect(sinRut.posibles).toEqual([{ proyectadoId: "f1", abonoId: "a1", monto: 500_000 }]);
    const otroRut = emparejarAbonosConCobros({ abonos: [abono("a1", 500_000, "DE 11.111.111-1")], cobros: [cobro("f1", 500_000, "76123456-0")] });
    expect(otroRut.posibles).toHaveLength(1);
  });
  it("un monto distinto no empareja nada", () => {
    const r = emparejarAbonosConCobros({ abonos: [abono("a1", 499_000, "DE 76.123.456-0")], cobros: [cobro("f1", 500_000, "76123456-0")] });
    expect(r.seguros.size + r.posibles.length).toBe(0);
  });
  it("un abono se usa una sola vez aunque dos facturas tengan el mismo monto", () => {
    const r = emparejarAbonosConCobros({
      abonos: [abono("a1", 100_000, "DE 76.123.456-0")],
      cobros: [cobro("f1", 100_000, "76123456-0"), cobro("f2", 100_000, "76123456-0")],
    });
    expect(r.seguros.size).toBe(1);
    expect(r.posibles).toEqual([]);
  });
  it("una coincidencia segura no pierde su abono frente a un posible de otra factura", () => {
    const r = emparejarAbonosConCobros({
      abonos: [abono("a1", 100_000, "DE 76.123.456-0")],
      cobros: [cobro("f1", 100_000, "99999999-9"), cobro("f2", 100_000, "76123456-0")],
    });
    expect([...r.seguros.keys()]).toEqual(["f2"]);
    expect(r.posibles).toEqual([]);
  });

  it("un abono con el RUT del factor no lo gasta una factura ajena de igual monto (seguros antes que posibles, entre conjuntos)", () => {
    const r = emparejarAbonosConCobros({
      abonos: [abono("a1", 5_000_000, "ABONO 99.999.999-9")],
      cobros: [cobro("factura-otro-cliente", 5_000_000, "76123456-0"), cobro("deposito-factor", 5_000_000, "99999999-9")],
    });
    expect([...r.seguros.entries()]).toEqual([["deposito-factor", "a1"]]);
    expect(r.posibles).toEqual([]);
  });
  it("un cobro con ventana no empareja abonos anteriores a su fecha", () => {
    const r = emparejarAbonosConCobros({
      abonos: [{ ...abono("a1", 100_000, "DE 76.123.456-0"), fecha: "2026-11-02" }],
      cobros: [{ ...cobro("f1", 100_000, "76123456-0"), desde: "2026-11-09" }],
    });
    expect(r.seguros.size + r.posibles.length).toBe(0);
  });
});

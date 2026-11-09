import { describe, expect, it } from "vitest";

import {
  conMontoInicial,
  type Elegida,
} from "@/app/(erp)/finanzas/bancos/_componentes/seleccion-conciliacion";

const doc = (id: string, pendiente: number, monto = 0): Elegida => ({
  id,
  tipo: "documento_emitido",
  etiqueta: id,
  pendiente,
  monto,
});

describe("conMontoInicial · reconocer un abono", () => {
  it("un abono que calza con la factura queda listo para confirmar", () => {
    const r = conMontoInicial([], doc("f1", 1_190_000), 1_190_000);
    expect(r.map((e) => e.monto)).toEqual([1_190_000]);
  });

  it("dos facturas para un abono de dos: cada una recibe lo que le falta", () => {
    const una = conMontoInicial([], doc("f1", 1_190_000), 2_380_000);
    const dos = conMontoInicial(una, doc("f2", 1_190_000), 2_380_000);
    expect(dos.map((e) => e.monto)).toEqual([1_190_000, 1_190_000]);
  });

  it("no pasa de lo que queda del abono ni de lo pendiente del documento", () => {
    const una = conMontoInicial([], doc("f1", 1_000_000), 1_500_000);
    const dos = conMontoInicial(una, doc("f2", 1_000_000), 1_500_000);
    expect(dos.map((e) => e.monto)).toEqual([1_000_000, 500_000]);
    expect(conMontoInicial([], doc("f3", 400_000), 1_500_000)[0]?.monto).toBe(400_000);
  });

  it("con el abono ya repartido el documento entra en cero (se ajusta a mano)", () => {
    const r = conMontoInicial([doc("f1", 1_190_000, 1_190_000)], doc("f2", 1_190_000), 1_190_000);
    expect(r[1]?.monto).toBe(0);
  });
});

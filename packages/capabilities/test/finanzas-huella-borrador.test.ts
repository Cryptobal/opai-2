// CAR-248 · La huella del borrador firmado cubre todo lo que cambia el XML, incluido el vencimiento: una edición de solo
// el plazo después de firmar debe impedir la emisión (el XML llevaría el vencimiento viejo).
import { describe, expect, it } from "vitest";

import { huellaBorrador } from "../src/finanzas/ventas-emision-preparar";

const base = {
  cuentaId: "c1",
  fechaEmision: new Date("2026-11-10"),
  fechaVencimiento: new Date("2026-12-10"),
  glosa: null,
  montoNeto: 1000,
  montoExento: 0,
  montoIva: 190,
  montoOtros: 0,
  montoTotal: 1190,
  lineas: [{ orden: 0, glosa: "Servicio", monto: 1000 }],
  referencias: [
    { tipoDteRef: 801, folioRef: 7, codigoRef: 1, razonRef: null, fechaRef: new Date("2026-10-01") },
    { tipoDteRef: 802, folioRef: 9, codigoRef: 1, razonRef: null, fechaRef: null },
  ],
};

describe("huellaBorrador", () => {
  it("cambia si cambia el vencimiento, una línea o un monto", () => {
    const h = huellaBorrador(base);
    expect(huellaBorrador({ ...base, fechaVencimiento: new Date("2026-12-31") })).not.toBe(h);
    expect(huellaBorrador({ ...base, lineas: [{ orden: 0, glosa: "Otro", monto: 1000 }] })).not.toBe(h);
    expect(huellaBorrador({ ...base, montoTotal: 1200 })).not.toBe(h);
  });
  it("cambia si cambia solo la fecha de una referencia (va en el XML firmado)", () => {
    const [primera, ...resto] = base.referencias;
    const otra = { ...primera!, fechaRef: new Date("2026-10-15") };
    expect(huellaBorrador({ ...base, referencias: [otra, ...resto] })).not.toBe(huellaBorrador(base));
  });
  it("no depende del orden en que vengan las referencias", () => {
    expect(huellaBorrador({ ...base, referencias: [...base.referencias].reverse() })).toBe(huellaBorrador(base));
  });
});

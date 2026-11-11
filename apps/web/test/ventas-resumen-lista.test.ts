import { describe, expect, it } from "vitest";

import { resumenLista } from "@/app/(erp)/finanzas/ventas/_componentes/resumen-lista";
import type { Venta } from "@/app/(erp)/finanzas/ventas/_componentes/tipos";

const venta = (p: Partial<Venta>): Venta => ({
  id: "x",
  cuentaId: "c",
  cuentaNombre: "Cliente de prueba",
  cuentaRut: null,
  tipoDte: 33,
  tipoDteNombre: "Factura electrónica",
  folio: null,
  fechaEmision: null,
  fechaVencimiento: null,
  trackIdSii: null,
  montoTotal: 1000,
  estadoDte: "borrador",
  estadoCobro: "pendiente",
  cesionEstado: null,
  ...p,
});

const norm = (t: string | null) => (t ?? "").replace(/\s/g, " "); // el formato de pesos usa espacio duro

describe("resumenLista (CAR-261)", () => {
  it("solo borradores: cuenta y suma lo visible y explica que no entran al libro", () => {
    const items = [...Array.from({ length: 5 }, () => venta({ montoTotal: 11_900 })), venta({ montoTotal: 1_190 })];
    const t = norm(resumenLista(items, null, null));
    expect(t).toContain("6 borradores");
    expect(t).toContain("$ 60.690");
    expect(t).toContain("Sin folio");
    expect(t).not.toContain("Neto");
  });

  it("con libro del período: usa el libro y declara los borradores aparte", () => {
    const items = [venta({ estadoDte: "aceptado", folio: 5 }), venta({ montoTotal: 500 })];
    const t = norm(resumenLista(items, null, { documentos: 12, neto: 100_000, iva: 19_000, total: 119_000 }));
    expect(t).toContain("Libro del período: 12 documentos");
    expect(t).toContain("Además 1 borrador por $ 500");
  });

  it("sin libro: suma los emitidos visibles y resta las notas de crédito", () => {
    const items = [venta({ estadoDte: "aceptado", folio: 1, montoTotal: 1000 }), venta({ estadoDte: "aceptado", folio: 2, tipoDte: 61, montoTotal: 300 })];
    expect(norm(resumenLista(items, null, null))).toBe("2 documentos · Total $ 700");
  });

  it("lista vacía sin libro no inventa cifras", () => {
    expect(resumenLista([], null, null)).toBeNull();
  });
});

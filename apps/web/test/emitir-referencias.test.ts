import { describe, expect, it } from "vitest";

import { construirInputBorrador, problemaReferencias, type RefForm } from "../app/(erp)/finanzas/ventas/nuevo/emitir-util";

const ref = (p: Partial<RefForm> = {}): RefForm => ({ tipo: "801", folioTexto: "4500", fecha: "2026-10-15", razon: "", ...p });

describe("referencias en Emitir (CAR-221 · A3)", () => {
  it("sin referencias no hay problema y el input no las trae", () => {
    expect(problemaReferencias([], "2026-11-07")).toBeNull();
    const i = construirInputBorrador({ cuentaId: "c", tipoDte: "33", plazo: 30, lineas: [{ glosa: "x", montoTexto: "1000" }], glosa: "", dryRun: true });
    expect(i).not.toHaveProperty("referencias");
  });

  it("valida código del catálogo, folio y fecha", () => {
    expect(problemaReferencias([ref()], "2026-11-07")).toBeNull();
    expect(problemaReferencias([ref({ tipo: "99" })], "2026-11-07")).toMatch(/catálogo/);
    expect(problemaReferencias([ref({ folioTexto: "" })], "2026-11-07")).toMatch(/folio/);
    expect(problemaReferencias([ref({ fecha: "" })], "2026-11-07")).toMatch(/fecha/);
    expect(problemaReferencias([ref({ fecha: "2026-12-01" })], "2026-11-07")).toMatch(/posterior/);
  });

  it("arma las referencias del borrador con folio, fecha y razón opcional", () => {
    const i = construirInputBorrador({
      cuentaId: "c", tipoDte: "33", plazo: 30, lineas: [{ glosa: "x", montoTexto: "1000" }], glosa: "",
      referencias: [ref(), ref({ tipo: "802", folioTexto: "88", razon: " HES octubre " })], dryRun: false,
    });
    expect(i.referencias).toEqual([
      { tipoDteRef: 801, folioRef: 4500, fechaRef: "2026-10-15" },
      { tipoDteRef: 802, folioRef: 88, fechaRef: "2026-10-15", razonRef: "HES octubre" },
    ]);
  });
});

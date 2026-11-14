import { describe, expect, it } from "vitest";

import { os10Efectivo } from "../app/(erp)/personas/_componentes/os10-efectivo";

// CAR-429: el vencimiento del OS-10 tiene una sola fuente (el documento vigente en Documentos).
describe("os10Efectivo", () => {
  const doc = { documentoId: "d1", venceEn: "2028-01-10" };

  it("sin documento usa el dato manual y lo marca como tal", () => {
    const e = os10Efectivo({ credencial: "A-1", venceEn: "2027-05-01" }, null);
    expect(e).toMatchObject({ venceEn: "2027-05-01", fuente: "manual", difiere: false });
  });

  it("con documento manda su vencimiento y avisa si la ficha difiere", () => {
    const e = os10Efectivo({ credencial: "A-1", venceEn: "2027-05-01" }, doc);
    expect(e).toMatchObject({
      credencial: "A-1",
      venceEn: "2028-01-10",
      fuente: "documento",
      difiere: true,
      documentoId: "d1",
    });
  });

  it("sin fecha manual no hay diferencia; con fechas iguales tampoco", () => {
    expect(os10Efectivo({ credencial: null, venceEn: null }, doc).difiere).toBe(false);
    expect(os10Efectivo({ credencial: null, venceEn: "2028-01-10" }, doc).difiere).toBe(false);
  });

  it("documento sin vencimiento no respalda: queda el dato manual", () => {
    const e = os10Efectivo({ credencial: null, venceEn: "2027-05-01" }, { ...doc, venceEn: null });
    expect(e).toMatchObject({ venceEn: "2027-05-01", fuente: "manual", documentoId: null });
  });

  it("sin nada no hay fuente", () => {
    expect(os10Efectivo(null, null)).toMatchObject({
      fuente: null,
      venceEn: null,
      credencial: null,
    });
  });
});

import { describe, expect, it } from "vitest";

import { notasCreditoConReferenciaVigente } from "./proyeccion-flujo";

const doc = (id: string, tipoDte: number, ref: string | null = null) => ({
  id,
  tipoDte,
  documentoReferenciaId: ref,
});

describe("notas de crédito en el flujo", () => {
  it("una NC total sobre una factura anulada no vuelve a restar", () => {
    // La factura F1 quedó anulada por la NC y ya no está entre los documentos que cuentan.
    const r = notasCreditoConReferenciaVigente([doc("nc1", 61, "f1")]);
    expect(r).toEqual([]);
  });

  it("una NC parcial sobre una factura vigente sí resta", () => {
    const r = notasCreditoConReferenciaVigente([doc("f1", 33), doc("nc1", 61, "f1")]);
    expect(r.map((d) => d.id)).toEqual(["f1", "nc1"]);
  });

  it("una NC sin referencia no se cuenta", () => {
    expect(notasCreditoConReferenciaVigente([doc("nc1", 61)])).toEqual([]);
  });

  it("las facturas siempre pasan", () => {
    expect(notasCreditoConReferenciaVigente([doc("f1", 33), doc("f2", 34)])).toHaveLength(2);
  });
});

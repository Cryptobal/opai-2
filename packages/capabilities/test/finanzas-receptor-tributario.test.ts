// CAR-240 · Decisión de Carlos: sin giro, dirección o comuna del receptor no se emite al SII; el mensaje dice qué falta.
import { describe, expect, it } from "vitest";

import { faltantesReceptorTributario, mensajeFaltantesReceptor } from "../src/finanzas/receptor-tributario";

const completo = { giro: "Servicios", calle: "Calle 1", comuna: "Comuna" };

describe("datos tributarios del receptor", () => {
  it("completo: nada falta", () => {
    expect(faltantesReceptorTributario(completo)).toEqual([]);
    expect(mensajeFaltantesReceptor(completo)).toBeNull();
  });
  it("vacío o con espacios cuenta como faltante, en orden giro, dirección, comuna", () => {
    expect(faltantesReceptorTributario({ giro: " ", calle: null, comuna: "" })).toEqual(["giro", "dirección", "comuna"]);
    expect(mensajeFaltantesReceptor({ giro: null, calle: null, comuna: null })).toBe(
      "Al cliente le faltan datos tributarios: giro, dirección y comuna. Complétalos en la ficha del cliente antes de emitir al SII.",
    );
  });
  it("un solo dato faltante va en singular", () => {
    expect(mensajeFaltantesReceptor({ ...completo, calle: null })).toBe(
      "Al cliente le falta un dato tributario: dirección. Complétalo en la ficha del cliente antes de emitir al SII.",
    );
  });
});

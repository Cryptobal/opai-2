import { describe, expect, it } from "vitest";

import { TIPOS_BLOQUE_PROPUESTA } from "../../../modules/cpq/domain/documento/propuesta-tecnica";
import { etiquetaBloquePropuesta } from "../app/(erp)/cotizaciones/[id]/_componentes/etiquetas-bloque-propuesta";

describe("etiquetaBloquePropuesta (CAR-229)", () => {
  it("da un nombre legible a todos los tipos de bloque", () => {
    for (const t of TIPOS_BLOQUE_PROPUESTA) expect(etiquetaBloquePropuesta(t)).not.toBe(t);
  });
  it("prefiere el título propio y cae al tipo desconocido", () => {
    expect(etiquetaBloquePropuesta("texto_libre", " Alcance ")).toBe("Alcance");
    expect(etiquetaBloquePropuesta("nuevo")).toBe("nuevo");
  });
});

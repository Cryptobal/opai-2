import { describe, expect, it } from "vitest";

import { esTipoVencimiento } from "../app/(erp)/documentos/vencimientos/_componentes/entidades";

describe("Vencimientos de documentos", () => {
  it("incluye empresa, cuenta, instalación, persona y puesto", () => {
    for (const tipo of ["tenant", "cuenta", "instalacion", "persona", "puesto"]) {
      expect(esTipoVencimiento(tipo)).toBe(true);
    }
  });

  it("deja fuera un dueño desconocido o vacío", () => {
    expect(esTipoVencimiento(null)).toBe(false);
    expect(esTipoVencimiento(undefined)).toBe(false);
    expect(esTipoVencimiento("negocio")).toBe(false);
  });
});

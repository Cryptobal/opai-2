import { describe, expect, it } from "vitest";

import {
  CLASES_PLANTILLA,
  VARIABLES_PLANTILLA,
  documentoUsaVariablesSensibles,
  nivelPlantillaValido,
  variablesDeDocumento,
  variablesDocumentoDesconocidas,
} from "./documento-plantillas";

describe("plantillas laborales de documentos", () => {
  it("N1 no sirve para contrato ni anexo (mínimo legal N2); N2 sirve para todas", () => {
    expect(nivelPlantillaValido("contrato_trabajo", "N1")).toBe(false);
    expect(nivelPlantillaValido("anexo_contrato", "N1")).toBe(false);
    expect(nivelPlantillaValido("recepcion_laboral", "N1")).toBe(true);
    expect(nivelPlantillaValido("carta_trabajador", "N1")).toBe(true);
    for (const c of CLASES_PLANTILLA.filter((x) => x !== "acta")) expect(nivelPlantillaValido(c, "N2")).toBe(true);
    expect(nivelPlantillaValido("acta", "N1")).toBe(true);
    expect(nivelPlantillaValido("acta", "N2")).toBe(false);
  });

  it("extrae variables sin repetir y en orden", () => {
    const t = "{persona.nombre}, RUT {persona.rut}; {persona.nombre} ingresa el {vinculo.inicio}.";
    expect(variablesDeDocumento(t)).toEqual(["persona.nombre", "persona.rut", "vinculo.inicio"]);
  });

  it("rechaza variables fuera del catálogo y no confunde llaves ajenas", () => {
    expect(variablesDocumentoDesconocidas("{persona.rut} {persona.edad} {banco.cuenta}")).toEqual([
      "persona.edad",
      "banco.cuenta",
    ]);
    expect(variablesDocumentoDesconocidas("Cláusula {a} y {} y { persona.rut }")).toEqual([]);
  });

  it("solo sueldo.* es sensible", () => {
    expect(documentoUsaVariablesSensibles("{persona.rut}")).toBe(false);
    expect(documentoUsaVariablesSensibles("Base {sueldo.base}")).toBe(true);
    expect(VARIABLES_PLANTILLA.filter((x) => x.sensible).map((x) => x.clave)).toEqual([
      "sueldo.base",
      "sueldo.gratificacion",
    ]);
  });
});

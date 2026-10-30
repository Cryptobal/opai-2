import { describe, expect, it } from "vitest";

import {
  esEstadoTerminal,
  estadoVivo,
  exigeAceptacionMedio,
  identidadN2,
  minimoDeClase,
  nivelAlMenos,
  nivelValido,
  transicionValida,
} from "./firma";

describe("firma — niveles por clase (R2)", () => {
  it("un contrato de trabajo nunca baja de N2 (CA4)", () => {
    expect(minimoDeClase("contrato_trabajo")).toBe("N2");
    expect(nivelValido("contrato_trabajo", "N1")).toBe(false);
    expect(nivelValido("contrato_trabajo", "N2")).toBe(true);
    expect(nivelValido("contrato_trabajo", "N3")).toBe(true);
    expect(nivelValido("anexo_contrato", "N1")).toBe(false);
  });

  it("recepciones y actas permiten N1; las actas no suben", () => {
    expect(nivelValido("recepcion_laboral", "N1")).toBe(true);
    expect(nivelValido("recepcion_laboral", "N2")).toBe(true);
    expect(nivelValido("recepcion_laboral", "N3")).toBe(false);
    expect(nivelValido("acta", "N1")).toBe(true);
    expect(nivelValido("acta", "N2")).toBe(false);
  });

  it("exige aceptación del medio electrónico solo en lo laboral con obligaciones (R10)", () => {
    expect(exigeAceptacionMedio("contrato_trabajo")).toBe(true);
    expect(exigeAceptacionMedio("anexo_contrato")).toBe(true);
    expect(exigeAceptacionMedio("recepcion_laboral")).toBe(false);
    expect(exigeAceptacionMedio("propuesta_comercial")).toBe(false);
  });

  it("compara niveles por su orden legal", () => {
    expect(nivelAlMenos("N2", "N1")).toBe(true);
    expect(nivelAlMenos("N1", "N2")).toBe(false);
    expect(nivelAlMenos("N2", "N2")).toBe(true);
  });
});

describe("firma — máquina de estados (§7)", () => {
  it("avanza de enviada a completada y marca terminales", () => {
    expect(transicionValida("enviada", "en_curso")).toBe(true);
    expect(transicionValida("en_curso", "completada")).toBe(true);
    expect(transicionValida("enviada", "completada")).toBe(true);
    expect(transicionValida("completada", "cancelada")).toBe(false);
    expect(esEstadoTerminal("completada")).toBe(true);
    expect(esEstadoTerminal("vencida")).toBe(true);
    expect(esEstadoTerminal("enviada")).toBe(false);
  });

  it("espera del prestador no cae de nivel y puede volver a en curso (§13)", () => {
    expect(transicionValida("en_curso", "espera_prestador")).toBe(true);
    expect(transicionValida("espera_prestador", "en_curso")).toBe(true);
    expect(estadoVivo("espera_prestador")).toBe(true);
    expect(estadoVivo("cancelada")).toBe(false);
  });
});

describe("firma — identidad N2 (R13)", () => {
  it("el trabajador enrolado usa prueba de vida; el resto, verificación externa", () => {
    expect(identidadN2("trabajador", true)).toBe("prueba_vida");
    expect(identidadN2("trabajador", false)).toBe("externa");
    expect(identidadN2("externo", false)).toBe("externa");
    expect(identidadN2("contacto", true)).toBe("externa");
  });
});

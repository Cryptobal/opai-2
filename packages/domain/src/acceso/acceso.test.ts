import { describe, expect, it } from "vitest";

import { decidirAcceso, type EntradaLista, type ModoLista } from "./listas";
import { normalizarDocumento, normalizarPatente } from "./documento";

const ZONA = "America/Santiago";
const base: EntradaLista = {
  tipo: "autorizada",
  clave: "12345678-5",
  tiposRegistro: [],
  vigenteDesde: null,
  vigenteHasta: null,
  dias: [],
  desdeMin: null,
  hastaMin: null,
  usoUnico: false,
  consumida: false,
};
// Lunes 2026-11-09 12:00 en Santiago (UTC-3 en verano).
const lunes = new Date("2026-11-09T15:00:00Z");
const decidir = (
  entradas: EntradaLista[],
  modo: ModoLista = "solo_autorizados",
  tipoRegistro = "visita",
  ahora = lunes,
) => decidirAcceso({ clave: "12345678-5", tipoRegistro, modo, entradas, ahora, zona: ZONA });

describe("documentos", () => {
  it("el RUN exige dígito verificador y se enmascara", () => {
    expect(normalizarDocumento({ tipo: "run", numero: "12.345.678-5" })).toEqual({
      tipo: "run",
      clave: "12345678-5",
      mascara: "12.3••.•••-5",
    });
    expect(normalizarDocumento({ tipo: "run", numero: "12.345.678-9" })).toBeNull();
  });
  it("el pasaporte exige país y número", () => {
    expect(normalizarDocumento({ tipo: "pasaporte", numero: "ab 123456", pais: "pe" })?.clave).toBe(
      "PE:AB123456",
    );
    expect(normalizarDocumento({ tipo: "pasaporte", numero: "AB123456" })).toBeNull();
  });
  it("la patente se normaliza", () => {
    expect(normalizarPatente("bb-cc 12")).toBe("BBCC12");
    expect(normalizarPatente("!!")).toBeNull();
  });
});

describe("decidirAcceso", () => {
  it("bloqueado gana a autorizado (R7)", () => {
    expect(decidir([base, { ...base, tipo: "bloqueada" }])).toEqual({
      resultado: "denegado",
      motivo: "bloqueado",
    });
  });
  it("en solo autorizados, sin entrada no entra; con entrada vigente sí", () => {
    expect(decidir([])).toEqual({ resultado: "denegado", motivo: "fuera_de_lista" });
    expect(decidir([base])).toEqual({ resultado: "permitido", motivo: null });
  });
  it("permitir fuera de lista deja entrar a quien no está bloqueado", () => {
    expect(decidir([], "permitir_fuera_de_lista").resultado).toBe("permitido");
  });
  it("fuera de horario o de día cuenta como no autorizado (R6)", () => {
    expect(decidir([{ ...base, dias: [2, 3] }])).toEqual({
      resultado: "denegado",
      motivo: "fuera_de_horario",
    });
    expect(decidir([{ ...base, desdeMin: 13 * 60, hastaMin: 18 * 60 }]).motivo).toBe(
      "fuera_de_horario",
    );
    expect(decidir([{ ...base, dias: [1], desdeMin: 9 * 60, hastaMin: 13 * 60 }]).resultado).toBe(
      "permitido",
    );
  });
  it("vigencia vencida es fuera de horario; el tipo de registro limita la entrada", () => {
    expect(decidir([{ ...base, vigenteHasta: new Date("2026-11-01T00:00:00Z") }]).motivo).toBe(
      "fuera_de_horario",
    );
    expect(decidir([{ ...base, tiposRegistro: ["contratista"] }]).motivo).toBe("fuera_de_lista");
  });
  it("uso único consumido se deniega (R8)", () => {
    expect(decidir([{ ...base, usoUnico: true, consumida: true }]).motivo).toBe(
      "uso_unico_consumido",
    );
    expect(decidir([{ ...base, usoUnico: true }]).resultado).toBe("permitido");
  });
});

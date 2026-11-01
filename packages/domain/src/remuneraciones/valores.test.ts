import { describe, expect, it } from "vitest";
import { CLAVES_INDICADORES } from "./indicadores";
import { publicacionesReferencia } from "./referencia.fixture";
import { indicadorUsado, juegoDeValores, valorAnomalo, ValorLegalFaltante } from "./valores";

describe("indicadores: R7, R8 y vigencia reproducible", () => {
  for (const [tipo, limite] of [["uf", 1], ["utm", 3], ["tasa", 20]] as const) {
    it(`${tipo}: incluye el límite ±${limite}% y retiene solo fuera`, () => {
      for (const signo of [-1, 1]) {
        expect(valorAnomalo(tipo, 10_000, 10_000 + signo * limite * 100)).toBe(false);
        expect(valorAnomalo(tipo, 10_000, 10_000 + signo * (limite * 100 + 1))).toBe(true);
      }
    });
  }
  it("IMM solo avisa si baja; tasa anterior cero sin respaldo", () => {
    expect(valorAnomalo("imm", 500_000, 553_553)).toBe(false);
    expect(valorAnomalo("imm", 553_553, 500_000)).toBe(true);
    expect(valorAnomalo("tasa", 0, 0)).toBe(false);
    expect(valorAnomalo("tasa", 0, 1)).toBe(true);
  });
  for (const indicador of CLAVES_INDICADORES) {
    it(`falta ${indicador}: bloquea sin inventar un valor`, async () => {
      await expect(juegoDeValores("2026-10-29", publicacionesReferencia().filter((v) => v.indicador !== indicador)))
        .rejects.toMatchObject({ codigo: "VALOR_LEGAL_FALTANTE", indicador });
    });
  }
  it("huella SHA-256 estable ante orden de registros/claves; foto independiente congelada", async () => {
    const valores = publicacionesReferencia();
    const juego = await juegoDeValores("2026-10-29", valores);
    const invertido = await juegoDeValores("2026-10-29", [...valores].reverse());
    expect(juego.huella).toMatch(/^[a-f0-9]{64}$/);
    expect(juego).toEqual(invertido);
    valores.find((v) => v.indicador === "imm")!.valor = 999_999;
    expect(indicadorUsado(juego, "imm").valor).toBe(553_553);
    expect(Object.isFrozen(indicadorUsado(juego, "topes").valor)).toBe(true);
  });
  it("elige por fecha, no por orden; no usa futuros, retenidos ni propuestos", async () => {
    const valores = publicacionesReferencia();
    valores.push({ indicador: "imm", valor: 600_000, vigenteDesde: "2027-01-01", fuente: "prueba",
      verificacion: "por_verificar", estado: "vigente" });
    valores.push({ indicador: "uf", valor: 8_000_000, vigenteDesde: "2026-10-30", fuente: "prueba",
      verificacion: "por_verificar", estado: "retenido" });
    const j = await juegoDeValores("2026-10-30", valores);
    expect(indicadorUsado(j, "imm").valor).toBe(553_553);
    expect(indicadorUsado(j, "uf").valor).toBe(4_123_701);
    expect(j.advertencias.join(" ")).toContain("valor en revisión");
    expect(j.advertencias.join(" ")).toContain("último valor del 2026-10-29");
    const futuro = await juegoDeValores("2027-01-01", valores);
    expect(indicadorUsado(futuro, "imm").valor).toBe(600_000);
    expect(futuro.advertencias.join(" ")).toContain("utm: se usa el último");
    expect(futuro.huella).not.toBe(j.huella);
  });
  it("valor caducado se informa; falta total, conflicto y fechas inválidas fallan cerradas", async () => {
    const valores = publicacionesReferencia().map((v) => ({ ...v, vigenteHasta: "2026-10-29" }));
    expect((await juegoDeValores("2026-11-01", valores)).advertencias.join()).toContain("último valor");
    await expect(juegoDeValores("2026-02-30", valores)).rejects.toThrow("Fecha inválida");
    await expect(juegoDeValores("2026-01-01", valores)).rejects.toBeInstanceOf(ValorLegalFaltante);
    await expect(juegoDeValores("2026-10-29", [...valores, valores[0]!])).rejects.toThrow("ambigua");
    await expect(juegoDeValores("2026-10-29", [{ indicador: "uf", valor: -1,
      vigenteDesde: "2026-10-29", fuente: "prueba", estado: "vigente", verificacion: "por_verificar" }]))
      .rejects.toThrow("fuera de rango");
  });
});

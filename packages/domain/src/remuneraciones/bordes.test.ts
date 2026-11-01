import { describe, expect, it } from "vitest";
import { redondearRazonCLP, UF_ESCALA } from "../dinero";
import { PATRONES_FABRICA } from "../turnos";
import { costoEmpleadorPorPersona } from "./costo-empresa";
import { entradaReferencia, juegoReferencia, publicacionesReferencia } from "./referencia.fixture";
import { indicadorUsado, juegoDeValores } from "./valores";

describe("bordes del contrato y evidencia de indicadores", async () => {
  const juego = await juegoReferencia();
  it("centraliza el redondeo exacto con mitad arriba y límites seguros", () => {
    expect(redondearRazonCLP(1n, 2n)).toBe(1);
    expect(redondearRazonCLP(-1n, 2n)).toBe(-1);
    expect(redondearRazonCLP(1n, 3n)).toBe(0);
    expect(() => redondearRazonCLP(1n, 0n)).toThrow();
    expect(() => redondearRazonCLP(2n ** 53n, 1n)).toThrow();
  });
  it("explicita SANNA y adicional; 0,30 adicional da 1,23 total, sin alterar provisiones", () => {
    const e = entradaReferencia();
    const a = costoEmpleadorPorPersona(e, juego);
    const b = costoEmpleadorPorPersona({ ...e, mutualAdicional: 3_000 }, juego);
    expect(a.desglose.mutualClp).toBe(8_303);
    expect(b.desglose.mutualClp).toBe(8_511);
    expect(b.desglose.vacacionesClp).toBe(a.desglose.vacacionesClp);
    expect(b.traza.find((t) => t.concepto === "Ley 16.744 y SANNA")?.variables)
      .toEqual({ basica: 9_000, sanna: 300, adicional: 3_000 });
  });
  it("Isapre: deduce salud hasta 7% del tope previsional (SII Oficio 2406/2016)", () => {
    const e = entradaReferencia(3_000_000);
    e.salud = { tipo: "isapre", planUf: 7 * UF_ESCALA };
    const a = costoEmpleadorPorPersona(e, juego);
    const b = costoEmpleadorPorPersona({ ...e, salud: { tipo: "isapre", planUf: 8 * UF_ESCALA } }, juego);
    expect(a.desglose.saludClp).toBe(288_659);
    expect(a.desglose.saludDeducibleClp).toBe(259_793);
    expect(b.desglose.impuestoUnicoClp).toBe(a.desglose.impuestoUnicoClp);
    expect(a.liquidoEstimadoClp - b.liquidoEstimadoClp).toBe(b.desglose.saludClp - a.desglose.saludClp);
    // Plan adicional bajo tope también es deducible, aunque supere 7% del sueldo.
    const menor = costoEmpleadorPorPersona({ ...e, salud: { tipo: "isapre", planUf: 6 * UF_ESCALA } }, juego);
    expect(menor.desglose.saludDeducibleClp).toBe(menor.desglose.saludClp);
  });
  it("horario opcional mal formado bloquea, en lugar de ignorarlo", () => {
    const e = entradaReferencia();
    e.horario = { patron: PATRONES_FABRICA[0]!, tramos: [{ horaInicio: "xx", horaFin: "20:00" }],
      colacionMin: 0, colacionFuera: true };
    expect(() => costoEmpleadorPorPersona(e, juego)).toThrow("Hora inválida");
    e.horario.tramos = [{ horaInicio: "08:00", horaFin: "20:00" }];
    const avisos = costoEmpleadorPorPersona(e, juego).advertencias.join();
    expect(avisos).not.toContain("excede");
    expect(avisos).toContain("Jornada excepcional");
    e.horario.tramos = [{ horaInicio: "08:00", horaFin: "18:00" }];
    expect(costoEmpleadorPorPersona(e, juego).advertencias.join()).not.toContain("Jornada excepcional");
  });
  it("UF diaria 31-oct confirmada: los casos dorados conservan su UF del 29-oct", async () => {
    const publicaciones = publicacionesReferencia();
    publicaciones.push({ indicador: "uf", valor: 4_124_763, vigenteDesde: "2026-10-31", estado: "vigente",
      fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm", consultadaEl: "2026-11-01", verificacion: "verificado" });
    const siguiente = await juegoDeValores("2026-10-31", publicaciones);
    expect(indicadorUsado(siguiente, "uf").valor).toBe(4_124_763);
    expect(indicadorUsado(juego, "uf").valor).toBe(4_123_701);
    expect(siguiente.huella).not.toBe(juego.huella);
  });
  it("todo indicador verificado exige fecha de consulta", async () => {
    const valores = publicacionesReferencia();
    for (const v of valores) { v.verificacion = "verificado"; delete v.consultadaEl; }
    await expect(juegoDeValores(juego.fecha, valores)).rejects.toThrow("Falta fecha de consulta");
  });
});

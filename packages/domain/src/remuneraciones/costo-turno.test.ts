import { describe, expect, it } from "vitest";
import { PATRONES_FABRICA, type CalculoHoras } from "../turnos";
import { costoPorTurno } from "./costo-turno";

const horario = (nombre: string, fin = "20:00"): CalculoHoras => ({
  patron: PATRONES_FABRICA.find((p) => p.nombre === nombre)!,
  tramos: [{ horaInicio: "08:00", horaFin: fin }], colacionMin: 0, colacionFuera: true,
});
const entrada = (h: CalculoHoras, posiciones = 1) => ({ costoPersonaMensualClp: 871_022,
  horario: h, posiciones, cobertura: "todo_el_ciclo" as const, diasMes: 30, jornadaLegalHoras: 42 });

describe("R18: puesto, mes, día y hora", () => {
  it("4×4 24 h: dos posiciones, cuatro personas; 12 h: dos personas", () => {
    const dia = costoPorTurno(entrada(horario("4×4")));
    const completo = costoPorTurno(entrada(horario("4×4"), 2));
    expect(dia.personasPorPuesto).toBe(2);
    expect(completo.personasPorPuesto).toBe(4);
    expect(completo.costoPuestoMensualClp).toBe(3_484_088);
    expect(completo.horasCubiertasMes).toBe(720);
    expect(dia.horasCubiertasMes).toBe(360);
    expect(dia.horasSemanales).toBe(42);
    expect(dia.ciclosPorMes).toBe(3.75);
    expect(dia.costoDiaClp).toBe(58_068);
    expect(dia.costoHoraClp).toBe(4_839);
    expect(dia.advertencias.join()).toContain("excepcional");
    expect(dia.horasExtraSemanales).toBe(0);
  });
  it("5×2 L–V 50 h: una persona y aviso sobre 42 h con propuesta de extra", () => {
    const r = costoPorTurno({ ...entrada(horario("5×2", "18:00")), cobertura: "dias_del_patron" });
    expect(r.personasPorPuesto).toBe(1);
    expect(r.horasSemanales).toBe(50);
    expect(r.horasExtraSemanales).toBe(8);
    expect(r.advertencias.join()).toContain("Excede 42 h");
    expect(r.horasCubiertasMes).toBeCloseTo(30 / 7 * 5 * 10);
  });
  it("reutiliza descuento de colación y horario nocturno; sobrescritura exige motivo", () => {
    const h = horario("4×4"); h.colacionFuera = false; h.colacionMin = 60;
    h.tramos = [{ horaInicio: "20:00", horaFin: "08:00" }];
    expect(costoPorTurno(entrada(h)).horasSemanales).toBe(38.5);
    expect(() => costoPorTurno({ ...entrada(h), personasOverride: { cantidadEscalada: 30_000, motivo: "" } })).toThrow("motivo");
    const r = costoPorTurno({ ...entrada(h), personasOverride: { cantidadEscalada: 30_000, motivo: "Refuerzo ficticio" } });
    expect(r.personasPorPuesto).toBe(3);
    expect(r.costoPuestoMensualClp).toBe(2_613_066);
  });
  it("rechaza patrón, horario, colación y divisores inválidos", () => {
    const h = horario("4×4");
    expect(() => costoPorTurno({ ...entrada(h), diasMes: 0 })).toThrow();
    expect(() => costoPorTurno(entrada({ ...h, tramos: [] }))).toThrow();
    expect(() => costoPorTurno(entrada({ ...h, tramos: [{ horaInicio: "xx", horaFin: "20:00" }] }))).toThrow();
    expect(() => costoPorTurno(entrada({ ...h, patron: { ...h.patron, diasTrabajo: 0 } }))).toThrow();
  });
});

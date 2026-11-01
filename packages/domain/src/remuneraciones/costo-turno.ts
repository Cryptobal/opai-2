import { redondearCLP } from "../dinero";
import { horasSemanalesSugeridas, type CalculoHoras } from "../turnos";
import { entero, razonClp } from "./aritmetica";
import { validarHorario } from "./horario";

/** R18. Dos posiciones (día/noche) para 24 h; ajuste de feriados pertenece a CPQ. */
export function costoPorTurno(e: {
  costoPersonaMensualClp: number; horario: CalculoHoras; posiciones: number;
  cobertura: "todo_el_ciclo" | "dias_del_patron";
  diasMes: number; jornadaLegalHoras: number;
  personasOverride?: { cantidadEscalada: number; motivo: string };
}) {
  const { patron } = e.horario;
  entero(e.costoPersonaMensualClp, "Costo persona"); entero(e.posiciones, "Posiciones", 1);
  entero(e.diasMes, "Días del mes", 1, 31); entero(e.jornadaLegalHoras, "Jornada legal", 1, 168);
  const { duraciones, netos } = validarHorario(e.horario);
  if (!["todo_el_ciclo", "dias_del_patron"].includes(e.cobertura)) throw new RangeError("Cobertura inválida");
  const ciclo = patron.diasTrabajo + patron.diasDescanso;
  const factorN = e.cobertura === "todo_el_ciclo" ? ciclo : 1;
  const factorD = e.cobertura === "todo_el_ciclo" ? patron.diasTrabajo : 1;
  let personasN = factorN * e.posiciones;
  let personasD = factorD;
  if (e.personasOverride) {
    entero(e.personasOverride.cantidadEscalada, "Personas escaladas", 1);
    if (!e.personasOverride.motivo.trim()) throw new RangeError("Sobrescritura de personas requiere motivo");
    personasN = e.personasOverride.cantidadEscalada; personasD = 10_000;
  }
  const costoPuestoMensualClp = razonClp([e.costoPersonaMensualClp, personasN], [personasD]);
  const minutosTurnoSuma = netos.reduce((s, m) => s + m, 0);
  const coberturaN = e.cobertura === "todo_el_ciclo" ? 1 : patron.diasTrabajo;
  const coberturaD = e.cobertura === "todo_el_ciclo" ? 1 : ciclo;
  const horasSemanales = horasSemanalesSugeridas(e.horario);
  return {
    personasPorPuesto: personasN / personasD,
    ciclosPorMes: e.diasMes / ciclo,
    horasSemanales,
    horasExtraSemanales: Math.max(0, horasSemanales - e.jornadaLegalHoras),
    costoPuestoMensualClp,
    costoDiaClp: razonClp([costoPuestoMensualClp], [e.diasMes]),
    costoHoraClp: razonClp([costoPuestoMensualClp, 60, netos.length, coberturaD],
      [e.diasMes, e.posiciones, minutosTurnoSuma, coberturaN]),
    horasCubiertasMes: e.diasMes * e.posiciones * minutosTurnoSuma * coberturaN / (60 * netos.length * coberturaD),
    advertencias: [
      ...(horasSemanales > e.jornadaLegalHoras ? [`Excede ${e.jornadaLegalHoras} h semanales: ajustar horario u horas extra`] : []),
      ...(duraciones.some((m) => m > 10 * 60) ? ["Jornada excepcional: verificar autorización DT en Asistencia"] : []),
    ],
    traza: { formulaPersonas: "posiciones × (trabajo+descanso)/trabajo; días del patrón: posiciones",
      formulaMes: "costo persona × personas; promedio díasMes/ciclo",
      costoPersonaClp: redondearCLP(e.costoPersonaMensualClp), personasN, personasD,
      diasMes: e.diasMes, ciclo, motivoOverride: e.personasOverride?.motivo ?? null },
  };
}

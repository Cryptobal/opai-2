import { intervaloTurno, patronValido, type CalculoHoras } from "../turnos";
import { entero } from "./aritmetica";

/** El helper de turnos tolera datos incompletos de UI; costear exige horario completo. */
export function validarHorario(h: CalculoHoras) {
  const p = h.patron;
  if (!patronValido(p.diasTrabajo, p.diasDescanso) || !["ciclico", "semanal"].includes(p.clase))
    throw new RangeError("Patrón inválido");
  if (!h.tramos.length) throw new RangeError("Falta horario");
  entero(h.colacionMin, "Colación minutos", 0, 240);
  if (typeof h.colacionFuera !== "boolean") throw new RangeError("Colación fuera debe ser booleano");
  if (p.clase === "semanal" && (p.diasTrabajo + p.diasDescanso !== 7 ||
      new Set(p.diasSemana).size !== p.diasTrabajo || p.diasSemana.some((d) => d < 1 || d > 7 || !Number.isInteger(d))))
    throw new RangeError("Patrón semanal incoherente");
  const duraciones = h.tramos.map((t) => intervaloTurno(t.horaInicio, t.horaFin).duracionMin);
  const netos = duraciones.map((m) => m - (h.colacionFuera ? 0 : h.colacionMin));
  if (netos.some((m) => m <= 0)) throw new RangeError("Horario sin horas trabajadas");
  return { duraciones, netos };
}

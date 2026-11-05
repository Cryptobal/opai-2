import { intervaloTurno, PATRONES_FABRICA } from "@opai/domain";
import { N, type Numero } from "./numero";
import type { Puesto } from "./tipos";

/** Cobertura semanal / jornada media del patrón. Un tramo representa una posición de servicio. */
export function personasPorPosicion(linea: Puesto): Numero {
  const patron =
    linea.patronDef ?? PATRONES_FABRICA.find((p) => p.nombre.replace("×", "x") === linea.patron.replace("×", "x"));
  if (!patron) throw new Error(`Patrón no reconocido: ${linea.patron}`);
  const minutos = intervaloTurno(linea.horaInicio, linea.horaFin).duracionMin;
  const trabajo = patron.clase === "semanal"
    ? N(patron.diasSemana.length) : N(7 * patron.diasTrabajo, patron.diasTrabajo + patron.diasDescanso);
  const sugerida = N(linea.diasCobertura * minutos).div(trabajo.por(N(minutos)));
  if (linea.personasPorPosicionEscaladas === undefined) return sugerida;
  if (!linea.motivoPersonas?.trim()) throw new Error("Sobrescribir personas exige motivo");
  return N(linea.personasPorPosicionEscaladas, 10_000);
}

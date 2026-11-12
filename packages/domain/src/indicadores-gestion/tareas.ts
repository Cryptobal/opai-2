// Regla del indicador «Tareas cumplidas a tiempo» (ADR-094): de las tareas que vencían en el período,
// qué parte se terminó sin atraso. Mide oportunidad, no cantidad de tareas.

import { diaEnZona } from "../actividades-tareas";

export type TareaMedible = {
  /** "pendiente" | "hecha" | "cancelada". */
  estado: string | null;
  vencimiento: Date;
  completadaEn: Date | null;
  todoElDia: boolean;
};

/**
 * ¿Entra en la medición? Una cancelada no cuenta ni a favor ni en contra: dejó de ser un compromiso.
 * Una pendiente que todavía no vence tampoco: a mitad de mes nadie está atrasado por lo que aún
 * tiene plazo. Una hecha cuenta siempre, aunque se haya adelantado.
 */
export function tareaCuenta(tarea: TareaMedible, ahora: Date): boolean {
  if (tarea.estado === "cancelada") return false;
  if (tarea.estado === "hecha") return true;
  return tarea.vencimiento.getTime() <= ahora.getTime();
}

/**
 * ¿Se terminó a tiempo? Con hora: hasta el instante del vencimiento. De todo el día: hasta el final
 * de ese día en la zona de la empresa. Una tarea pendiente nunca está a tiempo (`tareaCuenta` ya dejó
 * fuera las que aún tienen plazo).
 */
export function tareaATiempo(tarea: TareaMedible, zona: string): boolean {
  if (tarea.estado !== "hecha" || tarea.completadaEn === null) return false;
  if (!tarea.todoElDia) return tarea.completadaEn.getTime() <= tarea.vencimiento.getTime();
  return diaEnZona(tarea.completadaEn, zona) <= diaEnZona(tarea.vencimiento, zona);
}

/** Porcentaje con un decimal. `null` si no hay base: sin tareas no hay indicador, no un 0 %. */
export function porcentajeDe(parte: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((parte / total) * 1000) / 10;
}

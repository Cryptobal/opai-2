import type { Horario } from "./tipos";

/** Días de la semana en convención JS (`Date.getDay`): 0 = domingo … 6 = sábado. */
export const DIAS: { valor: number; corta: string; larga: string }[] = [
  { valor: 1, corta: "Lun", larga: "lunes" },
  { valor: 2, corta: "Mar", larga: "martes" },
  { valor: 3, corta: "Mié", larga: "miércoles" },
  { valor: 4, corta: "Jue", larga: "jueves" },
  { valor: 5, corta: "Vie", larga: "viernes" },
  { valor: 6, corta: "Sáb", larga: "sábado" },
  { valor: 0, corta: "Dom", larga: "domingo" },
];

/** Resumen corto de los días elegidos (en orden Lun→Dom). */
export function resumenDias(dias: readonly number[]): string {
  if (dias.length === 0) return "Sin días";
  if (dias.length === 7) return "Todos los días";
  return DIAS.filter((d) => dias.includes(d.valor))
    .map((d) => d.corta)
    .join(" · ");
}

/** Resumen de los horarios (hora fija "HH:MM" o intervalo "cada N min"). */
export function resumenHorarios(horarios: readonly Horario[]): string {
  if (horarios.length === 0) return "Sin horarios";
  return horarios
    .map((h) => (typeof h === "string" ? h : `cada ${h.cadaMin} min ${h.desde}–${h.hasta}`))
    .join(" · ");
}

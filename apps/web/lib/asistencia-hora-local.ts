import { formatearFechaHora } from "@opai/domain";

/** Mantiene la zona local del navegador que usaba el formulario, no convierte la propuesta. */
export function presentarHoraLocal(valor: string): string {
  return formatearFechaHora(valor, Intl.DateTimeFormat().resolvedOptions().timeZone, { segundos: true });
}

/** Solo habilita enviar cuando ambos campos DS forman una fecha y hora local completas. */
export function horaLocalCompleta(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor) && Number.isFinite(new Date(valor).getTime());
}

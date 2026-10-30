// Reglas puras del flujo de firma (envío, firma y verificación; firma.md §6, §7, §10, R17, R19).
// CAR-82 · PR 2. Sin base ni red. Complementa `firma.ts` (datos y política de PR 1).

import type { ClaseFirma, NivelFirma } from "./firma";

/** Hechos inmutables del flujo que quedan en la bitácora encadenada (R17, firma.md §9). */
export const TIPOS_EVIDENCIA = [
  "enviada",
  "vista",
  "codigo_enviado",
  "identidad_verificada",
  "firmada",
  "rechazada",
  "vencida",
  "cancelada",
  "completada",
] as const;
export type TipoEvidencia = (typeof TIPOS_EVIDENCIA)[number];

/** Estado de cada firmante dentro de la solicitud (firma.md §3, §7). */
export const ESTADOS_FIRMANTE = ["pendiente", "firmado", "rechazado"] as const;
export type EstadoFirmante = (typeof ESTADOS_FIRMANTE)[number];

/** Método de identificación N1 que queda en la evidencia (R12): trazo dibujado o nombre escrito. */
export const METODOS_FIRMA_N1 = ["trazo", "nombre"] as const;
export type MetodoFirmaN1 = (typeof METODOS_FIRMA_N1)[number];

/**
 * Clases cuyo envío N1 NO pide aprobación humana a un agente: actas y recepciones o tomas de
 * conocimiento (decisión de Carlos 29-oct-2026, P12, R19). Todo lo demás —y toda solicitud N2 o
 * N3— la pide. Las cartas al trabajador se envían con aprobación aunque sean N1 (§4, R19).
 */
const CLASES_N1_SIN_APROBACION: ReadonlySet<ClaseFirma> = new Set([
  "recepcion_laboral",
  "acta",
  "acta_reunion",
]);

/**
 * Si el envío de una solicitud pide aprobación humana cuando lo intenta un agente (R19, lista
 * cerrada). Es lo único que varía la aprobación por input: toda N2/N3 la pide; en N1 solo la piden
 * las clases fuera de la lista exenta (contratos de servicio, propuestas, cartas al trabajador).
 */
export function enviarRequiereAprobacion(clase: ClaseFirma, nivel: NivelFirma): boolean {
  if (nivel !== "N1") return true;
  return !CLASES_N1_SIN_APROBACION.has(clase);
}

/** Fecha de vencimiento de una solicitud a partir del envío y el plazo en días (R8). Pura. */
export function plazoVence(desde: Date, dias: number): Date {
  return new Date(desde.getTime() + dias * 24 * 3_600_000);
}

/** Enmascara un RUN para mostrarlo sin revelarlo entero (la evidencia guarda el canónico, CA8). */
export function enmascararRun(run: string | null | undefined): string | null {
  if (!run) return null;
  const limpio = run.replace(/[.\s]/g, "");
  if (limpio.length <= 4) return "•••";
  return `•••${limpio.slice(-4)}`;
}

import type { EstadoPeriodo } from "./tipos";

/**
 * Transiciones del período (nomina.md §6): avanza abierto → en revisión → cerrado → pagado. Se puede
 * devolver a la etapa anterior hasta el pago (reabrir exige motivo); pagado es terminal.
 */
export const TRANSICIONES_PERIODO: Readonly<Record<EstadoPeriodo, readonly EstadoPeriodo[]>> = {
  abierto: ["en_revision"],
  en_revision: ["abierto", "cerrado"],
  cerrado: ["en_revision", "pagado"],
  pagado: [],
};

export function transicionPeriodoValida(de: EstadoPeriodo, a: EstadoPeriodo): boolean {
  return TRANSICIONES_PERIODO[de].includes(a);
}

/** Retroceder (hacia una etapa anterior) pide motivo y queda en la auditoría. */
export function esRetrocesoPeriodo(de: EstadoPeriodo, a: EstadoPeriodo): boolean {
  return transicionPeriodoValida(de, a) && !(
    (de === "abierto" && a === "en_revision") ||
    (de === "en_revision" && a === "cerrado") ||
    (de === "cerrado" && a === "pagado")
  );
}

/** Las novedades solo se cargan o anulan mientras el período no está cerrado. */
export function periodoAdmiteNovedades(estado: EstadoPeriodo): boolean {
  return estado === "abierto" || estado === "en_revision";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Último día del mes (1–12), con año bisiesto. */
export function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Mes calendario del período: `inicio` y `fin` como fecha ISO `aaaa-mm-dd` (sin zona). */
export function limitesPeriodo(anio: number, mes: number): { inicio: string; fin: string } {
  return { inicio: `${anio}-${pad(mes)}-01`, fin: `${anio}-${pad(mes)}-${pad(diasDelMes(anio, mes))}` };
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** «Octubre 2026». */
export function etiquetaPeriodo(anio: number, mes: number): string {
  return `${MESES[mes - 1] ?? "?"} ${anio}`;
}

/** Fecha de cierre prevista: el `diaCierre` del mes, acotado a su último día (p. ej. 31 en febrero). */
export function fechaCierrePrevista(anio: number, mes: number, diaCierre: number): string {
  return `${anio}-${pad(mes)}-${pad(Math.min(Math.max(diaCierre, 1), diasDelMes(anio, mes)))}`;
}

export function periodoAnterior(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

export function periodoSiguiente(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

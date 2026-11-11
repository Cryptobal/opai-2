/**
 * Insignias de estado de las tarjetas del Resumen de la ficha (CAR-124, export ficha-persona v1 «Resumen»):
 * completo / incompleto / vence en N días / vencido. Puro: recibe `hoy` (aaaa-mm-dd) y los datos ya leídos.
 */
import type { CuentaPago } from "./lecturas-ficha";

export type TonoEstado = "success" | "warning" | "danger" | "neutro";
export type EstadoTarjeta = { tono: TonoEstado; etiqueta: string };

/** Días cuando se acerca un vencimiento: desde aquí la insignia pasa a «Vence en N días». */
export const DIAS_AVISO_VENCIMIENTO = 30;

const COMPLETO: EstadoTarjeta = { tono: "success", etiqueta: "Completo" };
const INCOMPLETO: EstadoTarjeta = { tono: "warning", etiqueta: "Incompleto" };

/** Días de `desde` a `hasta` (fechas aaaa-mm-dd); negativo si ya pasó. */
export function diasHasta(desde: string, hasta: string): number {
  const ms =
    Date.parse(`${hasta.slice(0, 10)}T00:00:00Z`) - Date.parse(`${desde.slice(0, 10)}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Vigencia de una fecha de término o vencimiento; null si no hay fecha. */
export function estadoVencimiento(
  hoy: string,
  vence: string | null | undefined,
  vigente = "Vigente",
): EstadoTarjeta | null {
  if (!vence) return null;
  const d = diasHasta(hoy, vence);
  if (d < 0) return { tono: "danger", etiqueta: "Vencido" };
  if (d === 0) return { tono: "danger", etiqueta: "Vence hoy" };
  if (d <= DIAS_AVISO_VENCIMIENTO)
    return { tono: "warning", etiqueta: d === 1 ? "Vence mañana" : `Vence en ${d} días` };
  return { tono: "success", etiqueta: vigente };
}

export type DatosPrevision = {
  afp: string | null;
  sistemaSalud: string | null;
  isapreNombre: string | null;
};

/** Completo con AFP y sistema de salud (y nombre de la isapre si cotiza en isapre). */
export function estadoPrevision(p: DatosPrevision): EstadoTarjeta {
  const isapre = /isapre/i.test(p.sistemaSalud ?? "");
  return p.afp && p.sistemaSalud && (!isapre || p.isapreNombre) ? COMPLETO : INCOMPLETO;
}

export type DatosPago = {
  bancoCodigo: string | null;
  tipoCuenta: string | null;
  numeroCuenta: string | null;
  rutTitular: string | null;
  porCorregir: boolean;
};

/** Completo con banco del catálogo, tipo, número y RUT del titular; un cambio pendiente se avisa aparte. */
export function estadoPago(v: DatosPago, pendiente: boolean): EstadoTarjeta {
  if (v.porCorregir) return { tono: "warning", etiqueta: "Banco por corregir" };
  if (pendiente) return { tono: "warning", etiqueta: "Cambio pendiente" };
  return v.bancoCodigo && v.tipoCuenta && v.numeroCuenta && v.rutTitular ? COMPLETO : INCOMPLETO;
}

export type DatosUniforme = {
  tallaCamisa: string | null;
  tallaPantalon: string | null;
  tallaChaqueta: string | null;
  tallaZapato: string | null;
} | null;

/** Cuántas de las 4 tallas registradas faltan. */
export function estadoUniforme(u: DatosUniforme): EstadoTarjeta {
  const faltan = [u?.tallaCamisa, u?.tallaPantalon, u?.tallaChaqueta, u?.tallaZapato].filter(
    (t) => !t,
  ).length;
  if (faltan === 0) return COMPLETO;
  return { tono: "warning", etiqueta: faltan === 1 ? "Falta 1 talla" : `Faltan ${faltan} tallas` };
}

/** Jornada DT: vigencia del plazo fijo si lo hay; si no, completo con horas semanales y distribución. */
export function estadoJornada(
  hoy: string,
  j: {
    horasSemanales: string | null;
    distribucion: string | null;
    terminoPlazoFijo: string | null;
  } | null,
): EstadoTarjeta {
  const plazo = estadoVencimiento(hoy, j?.terminoPlazoFijo, "Al día");
  if (plazo) return plazo;
  return j?.horasSemanales && j.distribucion ? COMPLETO : INCOMPLETO;
}

/** OS-10: vigencia de la credencial; sin fecha, «Sin registro». */
export function estadoOs10(hoy: string, o: { venceEn: string | null } | null): EstadoTarjeta {
  return estadoVencimiento(hoy, o?.venceEn) ?? { tono: "neutro", etiqueta: "Sin registro" };
}

/** «BancoEstado · Cuenta RUT ••••4821» (CAR-124, tarjeta Pago del Resumen y solicitud pendiente). */
export const cuentaCorta = (c: CuentaPago): string | null =>
  [
    c.bancoNombre ?? c.bancoCodigo,
    c.tipoCuentaEtiqueta ?? c.tipoCuenta,
    c.numeroCuenta ? `••••${c.numeroCuenta.replace(/\W/g, "").slice(-4)}` : null,
  ]
    .filter(Boolean)
    .join(" · ") || null;

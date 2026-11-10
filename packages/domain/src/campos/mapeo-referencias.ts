// Consentimiento de referencia + cuenta a valores del catálogo (CAR-138 PR 7). Puro: no consulta nada.
// Quien no autorizó su nombre sale anonimizado con su rubro y comuna; nada se inventa.
import type { ValorCampo } from "./tipos";

type Texto = string | null | undefined;
const t = (v: Texto): string | null => (v && v.trim() ? v.trim() : null);

export type FilaReferencia = {
  cuenta: { nombre: string; giro?: Texto; comuna?: Texto; clienteDesde?: Date | null };
  mostrarNombre: boolean;
  descripcion?: Texto;
  cita?: Texto;
};

/** Nombre público: el real solo si el cliente lo autorizó. */
export function nombreReferencia(r: FilaReferencia): string {
  if (r.mostrarNombre) return t(r.cuenta.nombre) ?? "Cliente";
  const rubro = t(r.cuenta.giro);
  const comuna = t(r.cuenta.comuna);
  if (rubro && comuna) return `Cliente de ${rubro} en ${comuna}`;
  if (rubro) return `Cliente de ${rubro}`;
  if (comuna) return `Cliente en ${comuna}`;
  return "Cliente (reservado)";
}

export function valoresReferencia(r: FilaReferencia): Record<string, ValorCampo> {
  return {
    "referencia.cliente": nombreReferencia(r),
    "referencia.rubro": t(r.cuenta.giro),
    "referencia.comuna": t(r.cuenta.comuna),
    "referencia.cliente_desde": r.cuenta.clienteDesde ?? null,
    "referencia.descripcion": t(r.descripcion),
    "referencia.cita": t(r.cita),
  };
}

export type ConsentimientoReferencia = {
  estado: string;
  otorgadoEn: Date | null;
  vigenteHasta: Date | null;
};

/**
 * Vigente: la última fila es un otorgamiento, ya empezó y no venció (`hoy` en `AAAA-MM-DD`, en la zona
 * en que se presenta: America/Santiago). Sin fila, revocado o vencido: no hay referencia (opt-in, por defecto no aparece).
 */
export function referenciaVigente(ultima: ConsentimientoReferencia | null, hoy: string): boolean {
  if (!ultima || ultima.estado !== "otorgado" || !ultima.otorgadoEn) return false;
  const dia = (d: Date) => d.toISOString().slice(0, 10);
  if (dia(ultima.otorgadoEn) > hoy) return false;
  return !ultima.vigenteHasta || dia(ultima.vigenteHasta) >= hoy;
}

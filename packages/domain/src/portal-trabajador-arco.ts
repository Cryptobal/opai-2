import { calcularPlazo, type TipoSolicitud } from "./cumplimiento";

/** Tipos que el trabajador puede solicitar desde el portal (sin acceso ni portabilidad: exportar aparte). */
export const TIPOS_ARCO_PORTAL = ["rectificacion", "cancelacion", "oposicion", "bloqueo"] as const;
export type TipoArcoPortal = (typeof TIPOS_ARCO_PORTAL)[number];

export const DETALLE_ARCO_MIN = 10;
export const DETALLE_ARCO_MAX = 2000;
export const CAMPOS_ARCO_MAX = 12;
export const CAMPO_ARCO_MAX = 120;

export function esTipoArcoPortal(t: string): t is TipoArcoPortal {
  return (TIPOS_ARCO_PORTAL as readonly string[]).includes(t);
}

export function validarDetalleArco(detalle: string): string | null {
  const t = detalle.trim();
  if (t.length < DETALLE_ARCO_MIN) return `Describe tu solicitud con al menos ${DETALLE_ARCO_MIN} caracteres.`;
  if (t.length > DETALLE_ARCO_MAX) return `El detalle no puede superar ${DETALLE_ARCO_MAX} caracteres.`;
  return null;
}

export function normalizarCamposArco(campos: readonly string[] | undefined): string[] {
  if (!campos?.length) return [];
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const c of campos) {
    const t = c.trim();
    if (!t || t.length > CAMPO_ARCO_MAX) continue;
    const k = t.toLowerCase();
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push(t);
    if (out.length >= CAMPOS_ARCO_MAX) break;
  }
  return out;
}

/**
 * Días de plazo para una solicitud del portal. Usa el ajuste del tenant si está configurado; si no,
 * 30 días corridos (referencia 1.0) hasta que Carlos confirme el valor legal en 07d.
 */
export function diasPlazoPortal(diasAjuste: number | null | undefined): number {
  if (diasAjuste != null && diasAjuste > 0) return Math.floor(diasAjuste);
  // TODO(decisión Carlos): plazo por defecto del portal si el tenant no configuró cumplimiento_solicitud_dias_plazo.
  return 30;
}

export function plazoPortal(recibidaEn: Date, diasAjuste: number | null | undefined): Date | null {
  return calcularPlazo(recibidaEn, diasPlazoPortal(diasAjuste));
}

/** Mensaje de acuse al trabajador (Ley 21.719, referencia 1.0). */
export function mensajeAcuseArco(tipo: TipoSolicitud): string {
  if (tipo === "cancelacion") {
    return "Registramos tu solicitud de eliminación de datos. Recibirás respuesta dentro de 30 días.";
  }
  return "Registramos tu solicitud. Recibirás respuesta dentro de 30 días.";
}

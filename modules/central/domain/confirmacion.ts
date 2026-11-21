// Confirmación previa al turno (CAR-750, plan Central agéntica F1). Dominio puro.

export const ESTADOS_CONFIRMACION = [
  "pendiente",
  "confirmado",
  "en_camino",
  "con_problema",
  "sin_respuesta",
] as const;
export type EstadoConfirmacion = (typeof ESTADOS_CONFIRMACION)[number];

export const RESPUESTAS_GUARDIA = ["confirmado", "en_camino", "con_problema"] as const;
export type RespuestaGuardia = (typeof RESPUESTAS_GUARDIA)[number];

export const FRANJAS_CONFIRMACION = ["noche", "dia", "ambos"] as const;
export type FranjaConfirmacion = (typeof FRANJAS_CONFIRMACION)[number];

const MOTIVO_PROBLEMA_MAX = 200;
export const ANTICIPACION_MIN = 15;
export const ANTICIPACION_MAX = 180;
export const ANTICIPACION_DEFECTO = 60;
export const PLAZO_RESPUESTA_MIN = 5;
export const PLAZO_RESPUESTA_MAX = 60;
export const PLAZO_RESPUESTA_DEFECTO = 15;

/** El guardia puede cambiar de respuesta hasta el inicio del turno; no después de «sin respuesta». */
export function puedeResponder(estado: EstadoConfirmacion, turnoInicio: Date, ahora = new Date()): boolean {
  if (estado === "sin_respuesta") return false;
  if (ahora.getTime() >= turnoInicio.getTime()) return false;
  return true;
}

/** Valida la transición por respuesta del guardia; exige motivo en «con_problema». */
export function estadoPorRespuesta(
  respuesta: RespuestaGuardia,
  motivo: string | null | undefined,
): EstadoConfirmacion | null {
  if (!RESPUESTAS_GUARDIA.includes(respuesta)) return null;
  if (respuesta === "con_problema") {
    const m = (motivo ?? "").trim();
    if (m.length < 1 || m.length > MOTIVO_PROBLEMA_MAX) return null;
    return "con_problema";
  }
  return respuesta;
}

/** Un trabajo del sistema marca el vencimiento del plazo sin respuesta del guardia. */
export function puedeMarcarSinRespuesta(estado: EstadoConfirmacion): boolean {
  return estado === "pendiente";
}

export type PoliticaConfirmacion = {
  anticipacionMin: number;
  plazoRespuestaMin: number;
  franja: FranjaConfirmacion;
};
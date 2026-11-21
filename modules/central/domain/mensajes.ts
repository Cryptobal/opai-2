// Mensajes a la central y avisos con acuse (spec §4, R16, R17). Dominio puro, sin base de datos.

export const TIPOS_MENSAJE = ["novedad", "consulta", "urgencia"] as const;
export type TipoMensaje = (typeof TIPOS_MENSAJE)[number];

/** Hilo: enviado → recibido (la central lo vio) → respondido → cerrado (spec §6). */
export const ESTADOS_HILO = ["enviado", "recibido", "respondido", "cerrado"] as const;
export type EstadoHilo = (typeof ESTADOS_HILO)[number];

export const TIPOS_AVISO = ["consigna", "cambio_turno", "instruccion"] as const;
export type TipoAviso = (typeof TIPOS_AVISO)[number];

export const TEXTO_MENSAJE_MAX = 1000;
export const TEXTO_AVISO_MAX = 2000;
/** Plazo por defecto para acusar un aviso (pregunta 6); el de la consulta es un ajuste de la Central. */
export const PLAZO_ACUSE_MIN = 15;

/** Una urgencia abre una alerta crítica de inmediato (R16). */
export const SEVERIDAD_URGENCIA = "critica" as const;
/** Una consulta sin respuesta y un aviso sin acuse entran a la cola (R16, R17, R2 terreno). */
export const SEVERIDAD_CONSULTA_VENCIDA = "media" as const;
export const SEVERIDAD_SIN_ACUSE = "alta" as const;

/** El texto es obligatorio salvo en una urgencia, que puede mandarse con un toque (spec §4). */
export function textoValido(tipo: TipoMensaje, texto: string): boolean {
  const t = texto.trim();
  if (t.length > TEXTO_MENSAJE_MAX) return false;
  return tipo === "urgencia" || t.length > 0;
}

/**
 * Estado del hilo tras un mensaje nuevo: la respuesta de la central lo deja «respondido»; uno del
 * guardia lo devuelve a «enviado» para que la central lo vea. Un hilo cerrado no acepta mensajes.
 */
export function estadoTrasMensaje(estado: EstadoHilo, autor: "persona" | "central"): EstadoHilo | null {
  if (estado === "cerrado") return null;
  return autor === "central" ? "respondido" : "enviado";
}

/** Por defecto solo la consigna pide acuse (spec §4); en los demás tipos lo decide quien envía. */
export function acuseObligatorioPorDefecto(tipo: TipoAviso): boolean {
  return tipo === "consigna";
}

/** Vigencia válida: sin fin, o fin posterior al inicio (spec §4). */
export function vigenciaValida(desde: Date | null, hasta: Date | null): boolean {
  return !desde || !hasta || hasta.getTime() > desde.getTime();
}

/** Un acuse después del plazo cuenta, pero queda como «acusado tarde» (spec §6). */
export function acuseTarde(venceEn: Date | null, acusadoEn: Date): boolean {
  return venceEn != null && acusadoEn.getTime() > venceEn.getTime();
}

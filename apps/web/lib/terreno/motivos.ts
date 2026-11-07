/** Textos de la cola de Terreno en lenguaje de negocio (CAR-78 · E1). */
export const ETIQUETA_TIPO: Record<string, string> = {
  "terreno.latido": "Aviso de que el teléfono estuvo activo",
};

export const etiquetaTipo = (tipo: string): string => ETIQUETA_TIPO[tipo] ?? "Registro de terreno";

/** Por qué el servidor no aceptó un hecho: qué pasó y qué hacer. */
export const MOTIVO_RECHAZO: Record<string, string> = {
  tipo_no_permitido: "Este tipo de registro ya no se acepta desde el teléfono.",
  payload_invalido: "Los datos del registro no eran válidos.",
  posterior_al_envio: "La hora del teléfono estaba adelantada. Revisa la fecha y hora del equipo.",
  muy_antiguo: "Pasaron más de 14 días sin poder enviarlo.",
  persona_no_valida: "La persona ya no está asignada a esta instalación.",
  lote_invalido: "El envío no era válido y el servidor lo devolvió.",
};

export const motivoRechazo = (motivo: string | null): string =>
  (motivo ? MOTIVO_RECHAZO[motivo] : undefined) ?? "El servidor no pudo aceptarlo.";

/** Textos de la cola de Terreno en lenguaje de negocio (CAR-78 · E1). */
export const ETIQUETA_TIPO: Record<string, string> = {
  "terreno.latido": "Aviso de que el teléfono estuvo activo",
  "rondas.marca": "Marca de un punto de ronda",
  "acceso.entrada": "Entrada a la instalación",
  "acceso.salida": "Salida de la instalación",
};

export const etiquetaTipo = (tipo: string): string => ETIQUETA_TIPO[tipo] ?? "Registro de terreno";

/** Por qué el servidor no aceptó un hecho: qué pasó y qué hacer. */
export const MOTIVO_RECHAZO: Record<string, string> = {
  tipo_no_permitido: "Este tipo de registro ya no se acepta desde el teléfono.",
  payload_invalido: "Los datos del registro no eran válidos.",
  posterior_al_envio: "La hora del teléfono estaba adelantada. Revisa la fecha y hora del equipo.",
  muy_antiguo: "Pasaron más de 14 días sin poder enviarlo.",
  persona_no_valida: "La persona ya no está asignada a esta instalación.",
  qr_invalido: "No se reconoce este código QR. Pide al supervisor revisar la etiqueta.",
  qr_ajeno: "Este código QR es de otra instalación.",
  documento_invalido: "El documento no es válido. Revísalo y vuelve a registrar.",
  patente_invalida: "La patente no es válida.",
  modulo_inactivo: "Este módulo no está activo para la empresa.",
  entrada_desconocida: "No se encontró la entrada de esta salida.",
  salida_repetida: "Esta entrada ya tenía su salida registrada.",
  lote_invalido: "El envío no era válido y el servidor lo devolvió.",
};

export const motivoRechazo = (motivo: string | null): string =>
  (motivo ? MOTIVO_RECHAZO[motivo] : undefined) ?? "El servidor no pudo aceptarlo.";

/** Hechos técnicos que no le dicen nada al guardia una vez enviados: no se listan en «Ya enviados». */
export const TIPOS_SILENCIOSOS: ReadonlySet<string> = new Set(["terreno.latido"]);

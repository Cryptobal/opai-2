// Reglas puras de cumplimiento (Ley 21.719, Brief 07d PR 2, bloque 5): plazo de la solicitud del
// titular (ARCO+), máquinas de estado de la solicitud y del incidente, y tipos de titular. Lógica
// pura: sin Next, React ni base de datos. Los valores legales (días de plazo) no los fija Claude;
// se calculan cuando Carlos/el abogado los configuran (§16.3), sin valor por defecto legal.

/** Tipos de titular que cubre 07d; el resto (cliente, usuario) llega con sus portales (§4.1). */
export const TITULARES = ["persona", "contacto"] as const;
export type TitularTipo = (typeof TITULARES)[number];

/** Derechos del titular (ARCO+). */
export const TIPOS_SOLICITUD = [
  "acceso",
  "rectificacion",
  "cancelacion",
  "oposicion",
  "portabilidad",
  "bloqueo",
] as const;
export type TipoSolicitud = (typeof TIPOS_SOLICITUD)[number];

/** El acceso y la portabilidad producen una exportación del titular (§4.4). */
export function produceExportacion(tipo: TipoSolicitud): boolean {
  return tipo === "acceso" || tipo === "portabilidad";
}

/**
 * Entidades de cumplimiento (Ley 21.719) cuyos documentos vinculados —hoy la exportación del titular,
 * con RUT, domicilio y contacto— solo se listan y descargan con `cumplimiento.read`, nunca con el
 * `documentos.read` general (que tienen supervisor y viewer). La exportación se vincula a su solicitud
 * (§4.4); quien no puede ver cumplimiento recibe «no encontrado», sin revelar que el documento existe.
 */
export const ENTIDADES_DOC_CUMPLIMIENTO = ["solicitud_arco"] as const;

export const ESTADOS_SOLICITUD = ["recibida", "en_proceso", "resuelta", "rechazada"] as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

/** Transiciones válidas de una solicitud. `resuelta` y `rechazada` son terminales. */
const TRANSICIONES_SOLICITUD: Readonly<Record<EstadoSolicitud, readonly EstadoSolicitud[]>> = {
  recibida: ["en_proceso", "resuelta", "rechazada"],
  en_proceso: ["resuelta", "rechazada"],
  resuelta: [],
  rechazada: [],
};

export const esTerminalSolicitud = (e: EstadoSolicitud): boolean =>
  TRANSICIONES_SOLICITUD[e].length === 0;

export function puedeAvanzarSolicitud(desde: EstadoSolicitud, hacia: EstadoSolicitud): boolean {
  return TRANSICIONES_SOLICITUD[desde].includes(hacia);
}

export const ESTADOS_INCIDENTE = ["abierto", "en_evaluacion", "notificado", "cerrado"] as const;
export type EstadoIncidente = (typeof ESTADOS_INCIDENTE)[number];

/**
 * Destinatarios del aviso de una brecha de datos personales (Ley 21.719 §16.5): la Agencia de
 * Protección de Datos y los titulares afectados. Una brecha solo queda «notificada» cuando constan
 * los avisos a todos: un aviso suelto (p. ej. solo a la Agencia) no cierra la obligación.
 */
export const DESTINATARIOS_BRECHA = ["agencia", "titulares"] as const;
export type DestinatarioBrecha = (typeof DESTINATARIOS_BRECHA)[number];

/** True si ya constan los avisos a TODOS los destinatarios que corresponden (Agencia y titulares). */
export function brechaNotificada(destinatariosAvisados: Iterable<string>): boolean {
  const set = new Set(destinatariosAvisados);
  return DESTINATARIOS_BRECHA.every((d) => set.has(d));
}

/** Destinatarios que aún faltan por avisar, dado lo ya avisado (vacío = brecha notificada). */
export function avisosPendientes(destinatariosAvisados: Iterable<string>): DestinatarioBrecha[] {
  const set = new Set(destinatariosAvisados);
  return DESTINATARIOS_BRECHA.filter((d) => !set.has(d));
}

/** Transiciones válidas de un incidente. Se puede cerrar desde cualquier estado; `cerrado` es final. */
const TRANSICIONES_INCIDENTE: Readonly<Record<EstadoIncidente, readonly EstadoIncidente[]>> = {
  abierto: ["en_evaluacion", "notificado", "cerrado"],
  en_evaluacion: ["notificado", "cerrado"],
  notificado: ["cerrado"],
  cerrado: [],
};

export const esTerminalIncidente = (e: EstadoIncidente): boolean =>
  TRANSICIONES_INCIDENTE[e].length === 0;

export function puedeAvanzarIncidente(desde: EstadoIncidente, hacia: EstadoIncidente): boolean {
  return TRANSICIONES_INCIDENTE[desde].includes(hacia);
}

const MS_DIA = 86_400_000;

/**
 * Plazo legal de atención de la solicitud (§16.3). Sin días configurados (null, 0 o negativo) no hay
 * plazo todavía: devuelve null (Claude no inventa el número legal). Con N días, el plazo es N días
 * corridos desde la recepción; si la ley fija días hábiles, Carlos lo ajusta al confirmar el valor.
 */
export function calcularPlazo(recibidaEn: Date, diasPlazo: number | null | undefined): Date | null {
  if (diasPlazo == null || diasPlazo <= 0) return null;
  return new Date(recibidaEn.getTime() + Math.floor(diasPlazo) * MS_DIA);
}

export type SemaforoPlazo = "sin_plazo" | "vigente" | "por_vencer" | "vencido";

/**
 * Semáforo del plazo para la bandeja (§8). `por_vencer` cuando faltan `margenDias` o menos; `vencido`
 * si ya pasó. Sin plazo configurado, `sin_plazo`. No decide nada legal: solo ordena la atención.
 */
export function semaforoPlazo(
  plazoEn: Date | null | undefined,
  ahora: Date,
  margenDias = 3,
): SemaforoPlazo {
  if (!plazoEn) return "sin_plazo";
  const restanteMs = plazoEn.getTime() - ahora.getTime();
  if (restanteMs < 0) return "vencido";
  if (restanteMs <= margenDias * MS_DIA) return "por_vencer";
  return "vigente";
}

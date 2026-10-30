// Reglas puras de firma electrónica (firma.md §2, §4, §6, §7; ADR-019, Ley 19.799). Sin base ni red.

/** Niveles de firma (firma.md §2). N3 (FEA) queda apagada en la v1, solo detrás de una interfaz. */
export const NIVELES_FIRMA = ["N1", "N2", "N3"] as const;
export type NivelFirma = (typeof NIVELES_FIRMA)[number];

/** Clases de documento con mínimo legal por la plataforma (R2, firma.md §4). */
export const CLASES_FIRMA = [
  "contrato_trabajo",
  "anexo_contrato",
  "recepcion_laboral",
  // Carta al trabajador (amonestación, término): N1 de toma de conocimiento, pero es una decisión
  // del empleador que lo compromete, así que un agente la envía solo con aprobación (R19, §4).
  "carta_trabajador",
  "propuesta_comercial",
  "contrato_servicio",
  "acta",
  "acta_reunion",
] as const;
export type ClaseFirma = (typeof CLASES_FIRMA)[number];

/** Rol del firmante en la solicitud (firma.md §3). */
export const ROLES_FIRMANTE = ["firma", "copia", "aprueba"] as const;
export type RolFirmante = (typeof ROLES_FIRMANTE)[number];

/** Quién firma: trabajador o usuario del tenant, contacto del cliente, o externo sin enrolar. */
export const TIPOS_FIRMANTE = ["trabajador", "contacto", "usuario", "externo"] as const;
export type TipoFirmante = (typeof TIPOS_FIRMANTE)[number];

/** Orden de recolección de firmas (R7). */
export const ORDENES_FIRMA = ["secuencial", "paralelo"] as const;
export type OrdenFirma = (typeof ORDENES_FIRMA)[number];

type ReglaClase = {
  minimo: NivelFirma;
  permitidos: readonly NivelFirma[];
  /** Exige la aceptación del medio electrónico del trabajador antes de firmar (R10). */
  requiereAceptacionMedio: boolean;
};

const ORDEN_NIVEL: Record<NivelFirma, number> = { N1: 1, N2: 2, N3: 3 };

/** Mínimo legal y niveles permitidos por clase; el tenant sube, nunca baja del mínimo (R2). */
export const REGLAS_CLASE_FIRMA: Readonly<Record<ClaseFirma, ReglaClase>> = {
  contrato_trabajo: { minimo: "N2", permitidos: ["N2", "N3"], requiereAceptacionMedio: true },
  anexo_contrato: { minimo: "N2", permitidos: ["N2", "N3"], requiereAceptacionMedio: true },
  recepcion_laboral: { minimo: "N1", permitidos: ["N1", "N2"], requiereAceptacionMedio: false },
  carta_trabajador: { minimo: "N1", permitidos: ["N1", "N2"], requiereAceptacionMedio: false },
  propuesta_comercial: {
    minimo: "N1",
    permitidos: ["N1", "N2", "N3"],
    requiereAceptacionMedio: false,
  },
  contrato_servicio: { minimo: "N1", permitidos: ["N1", "N2", "N3"], requiereAceptacionMedio: false },
  acta: { minimo: "N1", permitidos: ["N1"], requiereAceptacionMedio: false },
  acta_reunion: { minimo: "N1", permitidos: ["N1", "N2"], requiereAceptacionMedio: false },
};

/** `a` es al menos tan alto como `b` (N2 ≥ N1). */
export const nivelAlMenos = (a: NivelFirma, b: NivelFirma): boolean => ORDEN_NIVEL[a] >= ORDEN_NIVEL[b];

/** Nivel mínimo legal que el tenant puede fijar para una clase (R2). */
export const minimoDeClase = (clase: ClaseFirma): NivelFirma => REGLAS_CLASE_FIRMA[clase].minimo;

/** Un nivel vale para una clase si está permitido y no baja del mínimo legal (R2, R3). CA4. */
export function nivelValido(clase: ClaseFirma, nivel: NivelFirma): boolean {
  const r = REGLAS_CLASE_FIRMA[clase];
  return r.permitidos.includes(nivel) && nivelAlMenos(nivel, r.minimo);
}

/** La clase exige la aceptación previa del medio electrónico del trabajador (R10). */
export const exigeAceptacionMedio = (clase: ClaseFirma): boolean =>
  REGLAS_CLASE_FIRMA[clase].requiereAceptacionMedio;

/** Estados de una solicitud de firma (firma.md §7). */
export const ESTADOS_SOLICITUD_FIRMA = [
  "enviada",
  "en_curso",
  "completada",
  "rechazada",
  "vencida",
  "cancelada",
  "espera_prestador",
] as const;
export type EstadoSolicitudFirma = (typeof ESTADOS_SOLICITUD_FIRMA)[number];

const TRANSICIONES: Readonly<Record<EstadoSolicitudFirma, readonly EstadoSolicitudFirma[]>> = {
  enviada: ["en_curso", "completada", "rechazada", "vencida", "cancelada"],
  en_curso: ["completada", "rechazada", "vencida", "cancelada", "espera_prestador"],
  espera_prestador: ["en_curso", "vencida", "cancelada"],
  completada: [],
  rechazada: [],
  vencida: [],
  cancelada: [],
};

/** Transición de estado permitida (firma.md §7). */
export const transicionValida = (de: EstadoSolicitudFirma, a: EstadoSolicitudFirma): boolean =>
  TRANSICIONES[de].includes(a);

/** Un estado terminal ya no acepta más firmas ni cambios (firma.md §7). */
export const esEstadoTerminal = (e: EstadoSolicitudFirma): boolean => TRANSICIONES[e].length === 0;

/** Solo las solicitudes vivas aceptan firmas, recordatorios o cancelación. */
export const estadoVivo = (e: EstadoSolicitudFirma): boolean =>
  e === "enviada" || e === "en_curso" || e === "espera_prestador";

/** Código de un solo uso para N2 (R13): 6 dígitos, 10 minutos, 3 intentos. */
export const OTP_DIGITOS = 6;
export const OTP_VIGENCIA_MS = 10 * 60_000;
export const OTP_INTENTOS = 3;

/** Plazo por defecto de la solicitud (R8), en días, y recordatorios antes del vencimiento. */
export const PLAZO_FIRMA_DIAS = 7;
export const PLAZO_FIRMA_DIAS_MAX = 90;
export const RECORDATORIOS_HORAS = [48, 24] as const;

/** Versión del texto de aceptación del medio electrónico que queda en la evidencia (R10, R12). */
export const VERSION_ACEPTACION_MEDIO = "2026-10";

/** Camino de identidad N2 según el firmante (R13): prueba de vida del enrolado o verificación externa. */
export function identidadN2(tipo: TipoFirmante, enrolado: boolean): "prueba_vida" | "externa" {
  return tipo === "trabajador" && enrolado ? "prueba_vida" : "externa";
}

// Tipos de la pauta (Operaciones, Brief 11b). La pauta guarda series y excepciones; el resto se
// calcula (R11 de operaciones.md): nunca una fila por trabajador por día.

/** Forma del ciclo de un patrón de turno (catálogo del tenant, R2). */
export type PatronPauta = {
  clase: "ciclico" | "semanal";
  diasTrabajo: number;
  diasDescanso: number;
  /** 1 = lunes … 7 = domingo; solo en los semanales (5×2: 1 a 5). */
  diasSemana: readonly number[];
};

/** Serie de un puesto: patrón + inicio de ciclo + titular, con su vigencia (no se edita el pasado). */
export type SeriePauta = {
  id: string;
  puestoId: string;
  patron: PatronPauta;
  /** Primer día de trabajo de un ciclo; ancla la fase de los patrones cíclicos. */
  inicioCiclo: string;
  /** Persona titular; null = sin titular (PPC «Sin titular»). */
  titularId: string | null;
  desde: string;
  /** Último día de vigencia (inclusive); null = sin fecha límite (A2). */
  hasta: string | null;
};

export const TIPOS_EXCEPCION = [
  "ausencia",
  "licencia",
  "vacaciones",
  "permiso",
  "reemplazo",
  "refuerzo",
] as const;
export type TipoExcepcion = (typeof TIPOS_EXCEPCION)[number];

export const TIPOS_EXCEPCION_AUSENCIA = ["ausencia", "licencia", "vacaciones", "permiso"] as const;
export type TipoExcepcionAusencia = (typeof TIPOS_EXCEPCION_AUSENCIA)[number];

export type VarianteCelda = null | "reemplazo" | "refuerzo" | "refuerzo_extra";

export type ExcepcionPauta = {
  puestoId: string;
  fecha: string;
  tipo: TipoExcepcion;
  motivo: string;
  personaId: string | null;
};

/** Motivo de un puesto por cubrir (R6): sin titular, o el tipo de ausencia del día. */
export type MotivoPpc = "sin_titular" | TipoExcepcionAusencia;

export type EstadoCelda = "cubierto" | "libre" | "ppc" | "sin_serie";

export type CeldaPauta = {
  fecha: string;
  estado: EstadoCelda;
  motivo: MotivoPpc | null;
  /** El día se desvía de la serie por una excepción (se distingue en la grilla). */
  excepcion: boolean;
  /** Nombre del feriado si lo es; los feriados se marcan, no cambian el patrón. */
  feriado: string | null;
  titularId: string | null;
  /** Cobertura confirmada en la Diaria (registro operativo, no marca legal DT). */
  confirmado?: boolean;
  /** Marca manual de presencia cuando no hay Asistencia. */
  marcaManual?: boolean;
  /** Quién cubre el turno (reemplazo/refuerzo o titular efectivo). */
  cubiertoPorId?: string | null;
  variante?: VarianteCelda;
};

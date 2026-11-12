// Catálogo de indicadores de gestión (ADR-094, CAR-305). Lo que un módulo declara para medir la
// gestión de un cargo: cada indicador sale de hechos que el sistema ya registra, nunca se digita.
// Lógica pura: sin Next, React ni base de datos.

/** Qué clase de cosa mide: lo logrado, lo bien hecho o lo oportuno. Nunca cantidad de acciones. */
export const TIPOS_INDICADOR = ["resultado", "calidad", "oportunidad"] as const;
export type TipoIndicador = (typeof TIPOS_INDICADOR)[number];

/** "mayor": más es mejor (ventas). "menor": menos es mejor (turnos descubiertos). */
export const SENTIDOS_INDICADOR = ["mayor", "menor"] as const;
export type SentidoIndicador = (typeof SENTIDOS_INDICADOR)[number];

export const UNIDADES_INDICADOR = ["cantidad", "porcentaje", "clp", "uf", "horas", "dias"] as const;
export type UnidadIndicador = (typeof UNIDADES_INDICADOR)[number];

/**
 * A quién se atribuye el hecho. "usuario": quien actúa en el sistema (el responsable de un negocio o
 * de una tarea). "persona": la ficha laboral (quien marca asistencia o hace una ronda). El scorecard
 * por cargo une ambos cuando exista el vínculo usuario–Persona (CAR-314).
 */
export const SUJETOS_INDICADOR = ["usuario", "persona"] as const;
export type SujetoIndicador = (typeof SUJETOS_INDICADOR)[number];

/** Parte declarativa (serializable) de un indicador: es lo que ve el catálogo y el MCP. */
export type DefinicionIndicador = {
  /** `<modulo>.<nombre>` en minúsculas, dígitos y guion bajo. */
  id: string;
  nombre: string;
  /** Qué mide, en lenguaje de negocio. */
  descripcion: string;
  tipo: TipoIndicador;
  unidad: UnidadIndicador;
  sentido: SentidoIndicador;
  sujeto: SujetoIndicador;
  /** Meta sugerida en la unidad del indicador. La empresa fija la suya en el scorecard del cargo. */
  metaSugerida: number;
  /** Hechos de origen, en lenguaje de negocio ("tareas asignadas y su fecha de término"). */
  origen: string;
};

const ID_INDICADOR = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
export const NOMBRE_INDICADOR_MAX = 80;
export const DESCRIPCION_INDICADOR_MIN = 20;

const incluye = (lista: readonly string[], valor: unknown): boolean =>
  typeof valor === "string" && lista.includes(valor);

/**
 * Errores de una definición para el módulo que la declara. Vacío = válida. Se valida al declarar el
 * módulo, no al medir: un indicador mal definido no llega al catálogo.
 */
export function erroresDefinicionIndicador(def: DefinicionIndicador, modulo: string): string[] {
  const errores: string[] = [];
  if (!ID_INDICADOR.test(def.id)) {
    errores.push(`Id de indicador inválido "${def.id}": usa <modulo>.<nombre> en minúsculas.`);
  } else if (!def.id.startsWith(`${modulo}.`)) {
    errores.push(`El indicador "${def.id}" debe empezar con "${modulo}.".`);
  }
  const nombre = def.nombre.trim();
  if (nombre.length < 3 || nombre.length > NOMBRE_INDICADOR_MAX) {
    errores.push(`El nombre de "${def.id}" debe tener entre 3 y ${NOMBRE_INDICADOR_MAX} caracteres.`);
  }
  if (def.descripcion.trim().length < DESCRIPCION_INDICADOR_MIN) {
    errores.push(
      `La descripción de "${def.id}" debe decir qué mide (al menos ${DESCRIPCION_INDICADOR_MIN} caracteres).`,
    );
  }
  if (def.origen.trim().length < 5) {
    errores.push(`El indicador "${def.id}" debe declarar de qué hechos sale.`);
  }
  if (!incluye(TIPOS_INDICADOR, def.tipo)) errores.push(`Tipo inválido en "${def.id}".`);
  if (!incluye(UNIDADES_INDICADOR, def.unidad)) errores.push(`Unidad inválida en "${def.id}".`);
  if (!incluye(SENTIDOS_INDICADOR, def.sentido)) errores.push(`Sentido inválido en "${def.id}".`);
  if (!incluye(SUJETOS_INDICADOR, def.sujeto)) errores.push(`Sujeto inválido en "${def.id}".`);
  if (!Number.isFinite(def.metaSugerida) || def.metaSugerida <= 0) {
    errores.push(`La meta sugerida de "${def.id}" debe ser un número mayor que cero.`);
  } else if (def.unidad === "porcentaje" && def.metaSugerida > 100) {
    errores.push(`La meta sugerida de "${def.id}" es un porcentaje: no puede pasar de 100.`);
  }
  return errores;
}

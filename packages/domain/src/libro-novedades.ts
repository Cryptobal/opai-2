// Libro de novedades del núcleo (CAR-77 parte 2): ciclo de estados de una novedad. Cada cambio es un hecho nuevo
// (inmutable, ADR-023); el estado de la novedad es la proyección del último hecho.

export const GRAVEDADES_NOVEDAD_LIBRO = ["baja", "media", "alta"] as const;
export const ESTADOS_NOVEDAD_LIBRO = [
  "abierta",
  "en_atencion",
  "resuelta",
  "cerrada",
  "derivada",
] as const;
export const ACCIONES_NOVEDAD_LIBRO = [
  "tomar",
  "resolver",
  "cerrar",
  "derivar",
  "reabrir",
] as const;

export type GravedadNovedadLibro = (typeof GRAVEDADES_NOVEDAD_LIBRO)[number];
export type EstadoNovedadLibro = (typeof ESTADOS_NOVEDAD_LIBRO)[number];
export type AccionNovedadLibro = (typeof ACCIONES_NOVEDAD_LIBRO)[number];

/** Desde qué estados se puede hacer cada acción y a qué estado lleva. «Cerrada» es final. */
const TRANSICIONES: Readonly<
  Record<AccionNovedadLibro, { desde: readonly EstadoNovedadLibro[]; hacia: EstadoNovedadLibro }>
> = {
  tomar: { desde: ["abierta"], hacia: "en_atencion" },
  resolver: { desde: ["abierta", "en_atencion"], hacia: "resuelta" },
  cerrar: { desde: ["resuelta"], hacia: "cerrada" },
  derivar: { desde: ["abierta", "en_atencion"], hacia: "derivada" },
  reabrir: { desde: ["resuelta", "derivada"], hacia: "abierta" },
};

/** Estado al que lleva la acción, o null si no se puede desde el estado actual. */
export function siguienteEstadoNovedad(
  actual: EstadoNovedadLibro,
  accion: AccionNovedadLibro,
): EstadoNovedadLibro | null {
  const t = TRANSICIONES[accion];
  return t.desde.includes(actual) ? t.hacia : null;
}

/** Acciones disponibles desde un estado (para mostrar solo los botones que sirven). */
export function accionesNovedad(actual: EstadoNovedadLibro): AccionNovedadLibro[] {
  return ACCIONES_NOVEDAD_LIBRO.filter((a) => siguienteEstadoNovedad(actual, a) !== null);
}

/** Número visible de una novedad (NOV-0042), correlativo por empresa. */
export const codigoNovedad = (numero: number) => `NOV-${String(numero).padStart(4, "0")}`;

/** «NOV-42», «nov 42» o «42»: el número de la novedad, o null si el texto no lo es. */
export function numeroNovedadDeTexto(q: string): number | null {
  const m = /^\s*(?:nov[\s-]*)?(\d{1,9})\s*$/i.exec(q);
  return m ? Number(m[1]) : null;
}

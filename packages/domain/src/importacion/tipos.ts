// Motor común de importación de datos (CAR-279). Dominio puro: describe qué se puede importar, lee la
// planilla, propone el mapeo de columnas y valida cada fila. No conoce la base: lo usan los importadores
// de cada módulo (Comercial hoy; Personas y Finanzas después) a través de `@opai/capabilities`.

export type TipoCampo = "texto" | "rut" | "email" | "telefono" | "fecha" | "entero" | "decimal" | "booleano" | "opcion";

export type CampoImportable = {
  /** Clave estable del campo; también es el encabezado de la plantilla. */
  clave: string;
  /** Nombre que ve la persona al mapear columnas. */
  etiqueta: string;
  tipo: TipoCampo;
  requerido?: boolean;
  /** Valores aceptados cuando `tipo` es «opcion» (clave → textos que la nombran en una planilla). */
  opciones?: Readonly<Record<string, readonly string[]>>;
  /** Otros encabezados con que suele venir la columna (otros sistemas, exportes de OPAI 1). */
  sinonimos?: readonly string[];
  /** Valor de ejemplo para la plantilla descargable. */
  ejemplo?: string;
  ayuda?: string;
  largoMaximo?: number;
};

export type DefinicionImportador = {
  /** Identificador estable: «cuentas», «contactos», «instalaciones», «negocios». */
  id: string;
  etiqueta: string;
  descripcion: string;
  campos: readonly CampoImportable[];
};

/** Planilla ya leída: encabezados y filas como texto, sin interpretar. */
export type TablaCruda = {
  columnas: string[];
  filas: string[][];
  /** Número de fila de cada registro en la planilla original (la 1 es el encabezado), contando las filas en blanco. */
  lineas?: number[];
};

/** Encabezado de la planilla → clave del campo, o null para ignorar la columna. */
export type Mapeo = Record<string, string | null>;

export type ProblemaFila = { campo: string | null; mensaje: string };
export type ValorImportado = string | number | boolean | null;
export type FilaNormalizada = {
  /** Número de fila en la planilla (la 1 es el encabezado). */
  fila: number;
  datos: Record<string, ValorImportado>;
  errores: ProblemaFila[];
};

/** `filas`: lo que se procesa por llamada (una transacción); `filasArchivo`: lo que puede traer la planilla completa. */
export const LIMITES_IMPORTACION = { filas: 500, filasArchivo: 20_000, columnas: 60, bytes: 2_000_000, celda: 2000 } as const;

export class ErrorPlanilla extends Error {}

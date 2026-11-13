/** Tipos y ayudantes de las hojas de Laboral (CAR-223). */
export type TipoCampo = "texto" | "fecha" | "entero" | "decimal" | "si_no" | "opcion";
export type CampoLaboral = {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  max?: number;
  requerido?: boolean;
  /** Rango de un entero. */
  min?: number;
  maxValor?: number;
  /** Valores permitidos de un campo `opcion` (CAR-244: banco y tipo de cuenta, nunca texto libre). */
  opciones?: readonly { valor: string; etiqueta: string }[];
  /** Lista larga: selector con búsqueda (por nombre o código). */
  buscable?: boolean;
};
export type SeccionLaboral =
  "prevision" | "uniforme" | "jornada-dt" | "os10" | "contacto-laboral" | "pago" | "pago-agregar";
export type ConfigSeccion = {
  param: string;
  titulo: string;
  capacidad: string;
  exito: string;
  boton: string;
  /** Solo envía los campos que cambiaron, salvo que la capacidad exija todos (pago). */
  todos?: boolean;
  campos: readonly CampoLaboral[];
  armar: (id: string, c: Record<string, unknown>) => Record<string, unknown>;
};

export const t = (clave: string, etiqueta: string, max: number, requerido = false): CampoLaboral => ({
  clave,
  etiqueta,
  tipo: "texto",
  max,
  requerido,
});


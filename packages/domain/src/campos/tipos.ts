// Catálogo único de campos y tokens (CAR-138, etapa 1). Contrato puro: sin base de datos, sin Next ni React.
// Extiende la sintaxis `{{ruta.variable}}` de `plantillas.ts` (ADR-020) y presenta con `formato.ts` (R4).

/** Para qué documento se resuelve el campo. Un campo solo se resuelve en las finalidades que declara. */
export const FINALIDADES_CAMPO = ["propuesta", "contrato", "documento", "correo"] as const;
export type FinalidadCampo = (typeof FINALIDADES_CAMPO)[number];

export const ENTIDADES_CAMPO = [
  "empresa",
  "cuenta",
  "contacto",
  "persona",
  "instalacion",
  "negocio",
  "cotizacion",
  "referencia",
] as const;
export type EntidadCampo = (typeof ENTIDADES_CAMPO)[number];

export type TipoCampo = "texto" | "clp" | "numero" | "fecha" | "booleano" | "url";

/**
 * - `publica`: puede ir en cualquier documento que declare el campo.
 * - `interna`: dato de negocio que el cliente no debería ver salvo que el campo lo declare.
 * - `personal`: dato de una persona identificable (Ley 21.719).
 * - `sensible`: identificador o dato que solo se justifica en un acto concreto (p. ej. contrato).
 */
export type SensibilidadCampo = "publica" | "interna" | "personal" | "sensible";

/** De dónde sale el valor. Los datos económicos solo salen de `cpq`: nunca los genera una IA. */
export type FuenteCampo = "tenant" | "maestros" | "comercial" | "cpq" | "personas";

export type CampoDef = {
  /** `entidad.campo`, en minúsculas y snake_case. */
  clave: string;
  descripcion: string;
  tipo: TipoCampo;
  fuente: FuenteCampo;
  sensibilidad: SensibilidadCampo;
  finalidades: readonly FinalidadCampo[];
  /** Claves antiguas que siguen resolviendo a este campo (compatibilidad entre versiones). */
  alias?: readonly string[];
  /** Valor ficticio, solo para ejemplos y para el prompt exportable. */
  ejemplo: string;
};

/** Colección repetible: `{{#cada instalaciones}}…{{/cada}}`. Dentro, los campos de `entidad` toman cada elemento. */
export type ColeccionDef = {
  clave: string;
  entidad: EntidadCampo;
  descripcion: string;
};

export type ValorCampo = string | number | boolean | Date | null | undefined;
export type ValoresCampos = {
  /** Valores por clave canónica (`cuenta.nombre`). */
  campos?: Readonly<Record<string, ValorCampo>>;
  /** Elementos de cada colección, con las mismas claves canónicas. */
  colecciones?: Readonly<Record<string, ReadonlyArray<Readonly<Record<string, ValorCampo>>>>>;
};

export type CodigoProblemaCampo =
  | "token_desconocido"
  | "no_autorizado"
  | "formato_invalido"
  | "estructura"
  | "faltante"
  | "url_invalida";

export type ProblemaCampo = { codigo: CodigoProblemaCampo; mensaje: string; token?: string };

/**
 * Dueños que lista Documentos › Vencimientos. El explorador muestra los mismos: la subida desde
 * ahí queda en la empresa por defecto, y un documento de persona o puesto también vence.
 * La matriz de Personas sigue en `/personas/vencimientos`.
 */
export const TIPOS_EN_VENCIMIENTOS = [
  "tenant",
  "cuenta",
  "instalacion",
  "persona",
  "puesto",
] as const;

export type TipoVencimiento = (typeof TIPOS_EN_VENCIMIENTOS)[number];

export function esTipoVencimiento(tipo: string | null | undefined): tipo is TipoVencimiento {
  return !!tipo && (TIPOS_EN_VENCIMIENTOS as readonly string[]).includes(tipo);
}

/** Capa de `core.documento_tipos.list`. La empresa se guarda como dueño `tenant`. */
export const CAPA_DE_TIPO: Record<TipoVencimiento, string> = {
  tenant: "empresa",
  cuenta: "cuenta",
  instalacion: "instalacion",
  persona: "persona",
  puesto: "puesto",
};

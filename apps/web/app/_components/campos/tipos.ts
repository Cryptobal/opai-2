import { formatearFecha, formatearNumero } from "@opai/domain";

export type EntidadCampos = "cuenta" | "contacto" | "negocio";
export type ValorCampo = string | number | boolean | null;
export type CampoFicha = {
  campoId: string;
  clave: string;
  etiqueta: string;
  tipo: "texto" | "numero" | "fecha" | "lista" | "si_no";
  opciones: string[];
  obligatorio: boolean;
  valor: ValorCampo;
};

/** Entrada de la capacidad de cada ficha: cuentas y contactos en el núcleo, negocios en Comercial. */
export const entradaDe = (tipo: EntidadCampos, id: string) =>
  tipo === "negocio" ? { negocioId: id } : { entidad: tipo, id };

/** Texto para mostrar un valor en la ficha (null si está vacío). */
export function mostrarValor(c: CampoFicha): string | null {
  if (c.valor === null) return null;
  if (c.tipo === "si_no") return c.valor ? "Sí" : "No";
  if (c.tipo === "fecha" && typeof c.valor === "string") return formatearFecha(c.valor);
  if (c.tipo === "numero" && typeof c.valor === "number") return formatearNumero(c.valor, 4);
  return String(c.valor);
}

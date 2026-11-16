import {
  mostrarValorCampo,
  type CampoMostrable,
  type EntidadCampoPersonalizado,
  type ValorCampoPersonalizado,
} from "@opai/domain";

export type EntidadCampos = EntidadCampoPersonalizado;
export type ValorCampo = ValorCampoPersonalizado;
export type CampoFicha = CampoMostrable & {
  campoId: string;
  clave: string;
  etiqueta: string;
  descripcion: string | null;
  obligatorio: boolean;
  valorDefecto: ValorCampo;
  valor: ValorCampo;
};

/** Entrada de la capacidad de cada ficha: negocios en Comercial, el resto en el núcleo. */
export const entradaDe = (tipo: EntidadCampos, id: string) =>
  tipo === "negocio" ? { negocioId: id } : { entidad: tipo, id };

/** Texto para mostrar un valor en la ficha (null si está vacío). */
export const mostrarValor = (c: CampoFicha): string | null => mostrarValorCampo(c, c.valor);

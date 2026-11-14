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

/** Lectura y escritura de cada ficha: cuentas y contactos en el núcleo, negocios en Comercial. */
export function capacidadesDe(tipo: EntidadCampos, id: string) {
  return tipo === "negocio"
    ? {
        get: "comercial.negocio_campos.get",
        set: "comercial.negocio_campos.set",
        entrada: { negocioId: id },
      }
    : {
        get: "core.valores_personalizados.get",
        set: "core.valores_personalizados.set",
        entrada: { entidad: tipo, id },
      };
}

/** Texto para mostrar un valor en la ficha (null si está vacío). */
export function mostrarValor(c: CampoFicha): string | null {
  if (c.valor === null) return null;
  if (c.tipo === "si_no") return c.valor ? "Sí" : "No";
  if (c.tipo === "fecha" && typeof c.valor === "string") return formatearFecha(c.valor);
  if (c.tipo === "numero" && typeof c.valor === "number") return formatearNumero(c.valor, 4);
  return String(c.valor);
}

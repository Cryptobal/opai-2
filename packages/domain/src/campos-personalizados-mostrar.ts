// CAR-536 · Texto con que se muestra el valor de un campo personalizado en la ficha.
import type { FormatoNumeroCampo, OpcionCampo, TipoCampoPersonalizado } from "./campos-personalizados";
import type { ValorCampoPersonalizado } from "./campos-personalizados-valor";
import { formatearClp, formatearFecha, formatearFechaHora, formatearNumero } from "./formato";
import { formatearRut } from "./rut";
import { formatearTelefono } from "./telefono";

export type CampoMostrable = {
  tipo: TipoCampoPersonalizado;
  formato: FormatoNumeroCampo | null;
  /** Opciones del campo; en `usuario`, los miembros de la empresa (valor = id, etiqueta = nombre). */
  opciones: readonly OpcionCampo[];
};

function numero(n: number, formato: FormatoNumeroCampo | null): string {
  if (formato === "moneda_clp") return formatearClp(n);
  if (formato === "porcentaje") return `${formatearNumero(n, 2)}\u00a0%`;
  return formatearNumero(n, formato === "entero" ? 0 : 4);
}

/** Texto para la ficha, o null si el campo está vacío. */
export function mostrarValorCampo(c: CampoMostrable, valor: ValorCampoPersonalizado): string | null {
  if (valor === null) return null;
  const etiqueta = (v: string) => c.opciones.find((o) => o.valor === v)?.etiqueta ?? v;
  if (Array.isArray(valor)) return valor.map(etiqueta).join(", ");
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "number") return numero(valor, c.formato);
  switch (c.tipo) {
    case "fecha":
      return formatearFecha(valor);
    case "fecha_hora":
      return formatearFechaHora(valor);
    case "rut":
      return formatearRut(valor);
    case "telefono":
      return valor.startsWith("+56") ? formatearTelefono(valor) : valor;
    case "lista":
    case "radio":
    case "multiple":
    case "usuario":
      return etiqueta(valor);
    case "texto":
    case "texto_largo":
    case "numero":
    case "si_no":
    case "email":
    case "url":
      return valor;
    default: {
      const nunca: never = c.tipo;
      return nunca;
    }
  }
}

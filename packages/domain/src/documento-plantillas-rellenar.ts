// Relleno de una plantilla laboral con los datos de una persona (CAR-127, PR 4a · 07 Generar documento).
// Reglas puras: toma el texto de la plantilla y los valores ya resueltos de cada variable y devuelve los
// párrafos con el texto final. Una variable sin valor se deja a la vista como `{grupo.clave}` y se
// informa en `faltantes` (el diseño 07 la marca en ámbar y bloquea el botón de generar).

import { VARIABLES_PLANTILLA } from "./documento-plantillas";
import { parrafosDePlantilla } from "./documento-plantillas-texto";

export type ValoresPlantilla = Readonly<Record<string, string | null | undefined>>;

export type SegmentoRelleno = {
  texto: string;
  negrita: boolean;
  cursiva: boolean;
  /** Clave de la variable que quedó sin valor; null si el texto es literal o la variable se rellenó. */
  faltante: string | null;
};

export type RellenoPlantilla = {
  parrafos: SegmentoRelleno[][];
  /** Claves sin valor, sin repetir y en orden de aparición. */
  faltantes: string[];
};

export function rellenarPlantilla(texto: string, valores: ValoresPlantilla): RellenoPlantilla {
  const faltantes = new Set<string>();
  const parrafos = parrafosDePlantilla(texto).map((segmentos) =>
    segmentos.map((s): SegmentoRelleno => {
      if (s.tipo === "texto") return { texto: s.texto, negrita: s.negrita, cursiva: s.cursiva, faltante: null };
      const valor = valores[s.clave]?.trim();
      if (valor) return { texto: valor, negrita: s.negrita, cursiva: s.cursiva, faltante: null };
      faltantes.add(s.clave);
      return { texto: `{${s.clave}}`, negrita: s.negrita, cursiva: s.cursiva, faltante: s.clave };
    }),
  );
  return { parrafos, faltantes: [...faltantes] };
}

/** Etiqueta legible de una variable (la del catálogo; la clave si no existe). */
export const etiquetaDeVariable = (clave: string): string =>
  VARIABLES_PLANTILLA.find((v) => v.clave === clave)?.etiqueta ?? clave;

/** Fecha de calendario «aaaa-mm-dd» → «dd-mm-aaaa» (formato de los documentos). */
export const fechaDeDocumento = (dia: string): string => dia.split("-").reverse().join("-");

/** Pesos chilenos con separador de miles, p. ej. «$ 620.000». */
export const pesosDeDocumento = (monto: number): string =>
  `$ ${Math.trunc(monto).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

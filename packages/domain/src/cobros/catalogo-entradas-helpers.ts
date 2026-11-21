import { type EntradaCatalogo, esIncluidoEnBase, type ParteFinanzas } from "./catalogo-modulos";
import { type FormaCobro, type UnidadCobro } from "./catalogo";

export const modulo = (
  id: string,
  nombre: string,
  incluye: string,
  forma: FormaCobro,
  unidad: UnidadCobro | null,
): EntradaCatalogo => ({
  id,
  nombre,
  incluye,
  grupo: "modulo",
  incluidoEnBase: esIncluidoEnBase(id),
  formaSugerida: esIncluidoEnBase(id) ? null : forma,
  unidadSugerida: esIncluidoEnBase(id) ? null : unidad,
  dependencias: [],
});

export const parte = (
  id: ParteFinanzas,
  nombre: string,
  incluye: string,
  dependencias: readonly (readonly string[])[] = [],
): EntradaCatalogo => ({
  id,
  nombre,
  incluye,
  grupo: "parte_finanzas",
  incluidoEnBase: false,
  formaSugerida: "fijo",
  unidadSugerida: null,
  dependencias,
});
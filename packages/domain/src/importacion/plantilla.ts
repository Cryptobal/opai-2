import { aTabla, escribirCsv } from "./csv";
import type { DefinicionImportador, TablaCruda } from "./tipos";

/** Encabezados y fila de ejemplo de la plantilla de un importador. */
export function plantillaDe(def: DefinicionImportador): { columnas: string[]; ejemplo: string[] } {
  return { columnas: def.campos.map((c) => c.clave), ejemplo: def.campos.map((c) => c.ejemplo ?? "") };
}

/** Plantilla descargable en CSV (encabezados = claves de los campos, más una fila de ejemplo). */
export function plantillaCsv(def: DefinicionImportador): string {
  const p = plantillaDe(def);
  return escribirCsv(p.columnas, [p.ejemplo]);
}

/** Arma una planilla desde filas ya estructuradas (lo que envía un agente o un adaptador). */
export function tablaDeRegistros(registros: readonly Readonly<Record<string, unknown>>[]): TablaCruda {
  const columnas = [...new Set(registros.flatMap((r) => Object.keys(r)))];
  const texto = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" ? "" : String(v));
  return aTabla([columnas, ...registros.map((r) => columnas.map((c) => texto(r[c])))]);
}

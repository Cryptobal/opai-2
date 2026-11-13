// Catálogos de la previsión de una persona (CAR-276), alineados con los códigos del archivo de Previred y del
// LRE: AFP, régimen (AFP o IPS), tipo de pensión, sistema de salud, tramo de asignación familiar y moneda del APV.
// La ficha guarda el código, nunca el nombre libre; `normalizar*` convierte los textos anteriores al selector.

import { AFP, type AdministradoraAFP } from "./remuneraciones/indicadores";

export type OpcionCatalogo<T extends string = string> = { valor: T; etiqueta: string };

export const AFPS: readonly OpcionCatalogo<AdministradoraAFP>[] = [
  { valor: "capital", etiqueta: "Capital" },
  { valor: "cuprum", etiqueta: "Cuprum" },
  { valor: "habitat", etiqueta: "Habitat" },
  { valor: "modelo", etiqueta: "Modelo" },
  { valor: "planvital", etiqueta: "PlanVital" },
  { valor: "provida", etiqueta: "ProVida" },
  { valor: "uno", etiqueta: "Uno" },
];

export const REGIMENES_PREVISIONALES = [
  { valor: "afp", etiqueta: "AFP" },
  { valor: "ips", etiqueta: "IPS (ex INP)" },
] as const satisfies readonly OpcionCatalogo[];

export const TIPOS_PENSION = [
  { valor: "no", etiqueta: "Sin pensión" },
  { valor: "vejez", etiqueta: "Vejez" },
  { valor: "invalidez", etiqueta: "Invalidez" },
  { valor: "sobrevivencia", etiqueta: "Sobrevivencia" },
] as const satisfies readonly OpcionCatalogo[];

export const SISTEMAS_SALUD = [
  { valor: "fonasa", etiqueta: "Fonasa" },
  { valor: "isapre", etiqueta: "Isapre" },
] as const satisfies readonly OpcionCatalogo[];

/** Tramos de asignación familiar (Ley 18.987); «D» es sin derecho a monto. */
export const TRAMOS_ASIGNACION = [
  { valor: "A", etiqueta: "Tramo A" },
  { valor: "B", etiqueta: "Tramo B" },
  { valor: "C", etiqueta: "Tramo C" },
  { valor: "D", etiqueta: "Tramo D (sin derecho)" },
] as const satisfies readonly OpcionCatalogo[];

export const REGIMENES_APV = [
  { valor: "A", etiqueta: "Régimen A" },
  { valor: "B", etiqueta: "Régimen B" },
] as const satisfies readonly OpcionCatalogo[];

export const MONEDAS_APV = [
  { valor: "clp", etiqueta: "Pesos" },
  { valor: "uf", etiqueta: "UF" },
  { valor: "pct", etiqueta: "% de la renta" },
] as const satisfies readonly OpcionCatalogo[];

/** Campo del LRE «persona con discapacidad o pensionada por invalidez». Dato de salud: sensible. */
export const DISCAPACIDAD_INVALIDEZ = [
  { valor: "no", etiqueta: "No" },
  { valor: "discapacidad", etiqueta: "Persona con discapacidad" },
  { valor: "pension_invalidez", etiqueta: "Pensionada por invalidez" },
] as const satisfies readonly OpcionCatalogo[];

type Valores<T extends readonly OpcionCatalogo[]> = T[number]["valor"];
export type RegimenPrevisional = Valores<typeof REGIMENES_PREVISIONALES>;
export type TipoPension = Valores<typeof TIPOS_PENSION>;
export type SistemaSalud = Valores<typeof SISTEMAS_SALUD>;
export type TramoAsignacion = Valores<typeof TRAMOS_ASIGNACION>;
export type RegimenApv = Valores<typeof REGIMENES_APV>;
export type MonedaApv = Valores<typeof MONEDAS_APV>;
export type DiscapacidadInvalidez = Valores<typeof DISCAPACIDAD_INVALIDEZ>;

/** Valores de un catálogo, para `z.enum` en el borde. */
export const valoresDe = <T extends string>(c: readonly OpcionCatalogo<T>[]) =>
  c.map((o) => o.valor) as [T, ...T[]];

const simple = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Convierte un texto escrito a mano («AFP Habitat», «Plan Vital») al código del catálogo, o null si no calza. */
function normalizar<T extends string>(c: readonly OpcionCatalogo<T>[], texto: string | null | undefined, quitar = "") {
  if (!texto) return null;
  let s = simple(texto);
  if (quitar && s.startsWith(quitar) && s !== quitar) s = s.slice(quitar.length);
  return c.find((o) => simple(o.valor) === s || simple(o.etiqueta) === s)?.valor ?? null;
}

export const normalizarAfp = (t: string | null | undefined): AdministradoraAFP | null =>
  normalizar(AFPS, t, "afp") ?? (AFP.find((a) => a === simple(t ?? "")) ?? null);
export const normalizarRegimen = (t: string | null | undefined): RegimenPrevisional | null =>
  normalizar(REGIMENES_PREVISIONALES, t) ?? (simple(t ?? "").includes("inp") ? "ips" : null);
export const normalizarSalud = (t: string | null | undefined): SistemaSalud | null =>
  normalizar(SISTEMAS_SALUD, t);

/** Etiqueta de un código, o el texto tal cual si es anterior al selector. */
export function etiquetaDe(c: readonly OpcionCatalogo[], valor: string | null | undefined): string | null {
  if (!valor) return null;
  return c.find((o) => o.valor === valor)?.etiqueta ?? valor;
}

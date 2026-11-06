/**
 * Catálogo comercial de Plataforma (CAR-204, ADR-071 adenda y ADR-072): una entrada por cobrable.
 * Es la fuente única de qué incluye el plan base, qué partes tiene Finanzas y qué necesita cada una.
 * Los ids de las partes de Finanzas (`PARTES_FINANZAS`) son los que usa «Finanzas · Code» para declarar
 * la parte de cada capacidad y filtrar por las partes contratadas: se importan, no se redefinen.
 */
import type { FormaCobro, UnidadCobro } from "./catalogo";

/** Módulo de Finanzas entero (mismo id del registro; ADR-072). */
export const MODULO_FINANZAS = "finanzas";

/** Las siete partes contratables de Finanzas (ADR-072); Conciliación va dentro de Bancos. */
export const PARTES_FINANZAS = [
  "finanzas.bancos",
  "finanzas.flujo",
  "finanzas.ventas",
  "finanzas.cobranza",
  "finanzas.factoring",
  "finanzas.compras",
  "finanzas.contabilidad",
] as const;
export type ParteFinanzas = (typeof PARTES_FINANZAS)[number];
export const esParteFinanzas = (id: string): id is ParteFinanzas =>
  (PARTES_FINANZAS as readonly string[]).includes(id);

/**
 * Módulos que vienen en el plan base y no tienen precio aparte (DECISIÓN CARLOS, 4-nov-2026 20:45).
 * Es el ÚNICO lugar donde se decide: cambiarlo es agregar o quitar un id. El Agente interno queda
 * fuera hasta que Carlos decida (pendiente): para incluirlo, agrégalo aquí.
 */
export const MODULOS_INCLUIDOS_EN_BASE: readonly string[] = [
  "tickets",
  "portal_trabajador",
  "portal_cliente",
];

export const esIncluidoEnBase = (id: string) => MODULOS_INCLUIDOS_EN_BASE.includes(id);

export type GrupoCatalogo = "base" | "modulo" | "finanzas" | "parte_finanzas";

export type EntradaCatalogo = {
  id: string;
  nombre: string;
  /** Texto corto de lo que incluye. */
  incluye: string;
  grupo: GrupoCatalogo;
  /** Sin precio aparte: viene en el plan base (el plan base mismo no cuenta). */
  incluidoEnBase: boolean;
  /** Forma y unidad sugeridas al fijar el precio (null si no se cobra aparte). */
  formaSugerida: FormaCobro | null;
  unidadSugerida: UnidadCobro | null;
  /** Cada grupo es una alternativa: basta que se cumpla un id de cada grupo (Contabilidad: Ventas o Compras). */
  dependencias: readonly (readonly string[])[];
};

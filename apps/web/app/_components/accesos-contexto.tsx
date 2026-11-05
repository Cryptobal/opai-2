"use client";

import { createContext, useContext } from "react";

import type { ItemFijado } from "@opai/ds";

import type { AccionCmdK } from "@/lib/navegacion-entradas";

/**
 * Lo que el shell ya sabe de «mis accesos» (fijados de `core.config`, recientes del navegador y las
 * acciones permitidas del ⌘K), para que Inicio lo muestre sin repetir consultas (CAR-182). `fijados`
 * es `undefined` mientras las preferencias cargan.
 */
export type Accesos = {
  fijados: readonly ItemFijado[] | undefined;
  error: boolean;
  reintentar: (() => void) | undefined;
  onFijar: ((item: ItemFijado) => void) | undefined;
  onDesfijar: ((href: string) => void) | undefined;
  recientes: () => readonly ItemFijado[];
  acciones: readonly AccionCmdK[];
  rutaActual: string;
  onNavegar: (href: string) => void;
};

export const AccesosContexto = createContext<Accesos | null>(null);

/** Accesos del shell; fuera del ERP con acceso (o en pruebas) no hay contexto. */
export function useAccesos(): Accesos | null {
  return useContext(AccesosContexto);
}

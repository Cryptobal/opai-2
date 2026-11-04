"use client";

import { useCallback } from "react";

import type { ItemFijado, NavItem } from "@opai/ds";

import { leerRecientes } from "./use-recientes";

/**
 * Recientes del menú «Más» del teléfono: se leen del navegador al abrir el menú (no en cada render
 * del shell) y toman el icono de la navegación cuando la ruta es una entrada del menú.
 */
export function useRecientesMas(epoca: string, nav: readonly NavItem[]) {
  return useCallback(
    (): ItemFijado[] =>
      leerRecientes(epoca).map((r) => {
        const icono = nav.find((n) => n.href === r.href)?.icono;
        return icono ? { ...r, icono } : r;
      }),
    [epoca, nav],
  );
}

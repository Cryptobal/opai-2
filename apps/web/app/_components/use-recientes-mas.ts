"use client";

import { useCallback } from "react";

import { canonicalizarReciente, type ItemFijado, type NavItem } from "@opai/ds";

import { leerRecientes } from "./use-recientes";

/**
 * Recientes del menú «Más» del teléfono: se leen del navegador al abrir el menú (no en cada render
 * del shell), se reducen a su sección cuando llevan su título genérico y toman el icono de la navegación cuando la ruta es una entrada del menú.
 */
export function useRecientesMas(epoca: string, nav: readonly NavItem[]) {
  return useCallback(
    (): ItemFijado[] =>
      leerRecientes(epoca).map((guardado) => {
        // La ficha de una sección lleva el título de la sección: cuenta como la sección (CAR-224).
        const r = canonicalizarReciente(guardado, nav);
        const icono = nav.find((n) => n.href === r.href)?.icono;
        return icono ? { ...r, icono } : r;
      }),
    [epoca, nav],
  );
}

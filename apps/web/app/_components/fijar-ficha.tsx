"use client";

import { createContext, type ReactNode, useContext, useMemo, useSyncExternalStore } from "react";

import { PinDiferido } from "@opai/ds";

/** Fijar o desfijar la ficha abierta: lo provee el marco del shell (§8.2.3). */
export type FijarFicha = { fijado: boolean; onFijar: () => void };

export const FijarFichaContext = createContext<FijarFicha | null>(null);

const DESDE_LG = "(min-width: 1024px)";

function suscribir(avisar: () => void) {
  const mq = window.matchMedia(DESDE_LG);
  mq.addEventListener("change", avisar);
  return () => mq.removeEventListener("change", avisar);
}

/**
 * «Fijar» de la ficha cuando va dentro del menú «Más» de la cabecera: bajo 1024 px (teléfono y riel
 * de iPad). Desde 1024 px lo muestra el botón de la cabecera, así que aquí devuelve `null`.
 */
export function useFijarEnMenu(): FijarFicha | null {
  const fijar = useContext(FijarFichaContext);
  const bajoLg = useSyncExternalStore(
    suscribir,
    () => !window.matchMedia(DESDE_LG).matches,
    () => false,
  );
  return bajoLg ? fijar : null;
}

/**
 * «Fijar» de la ficha en el shell: el botón de la cabecera (solo desde 1024 px) y el contexto que
 * `AccionesEntidad` usa para ponerlo en el menú «Más» bajo 1024 px (CAR-64).
 */
export function usePinFicha(
  activo: boolean,
  fijado: boolean | undefined,
  onFijar: (() => Promise<void> | void) | undefined,
): { contexto: FijarFicha | null; boton: ReactNode } {
  const contexto = useMemo(
    () => (activo && onFijar ? { fijado: fijado ?? false, onFijar: () => void onFijar() } : null),
    [activo, fijado, onFijar],
  );
  const boton = contexto ? (
    <PinDiferido
      variante="ficha"
      fijado={contexto.fijado}
      onFijar={contexto.onFijar}
      className="max-lg:hidden"
    />
  ) : null;
  return { contexto, boton };
}

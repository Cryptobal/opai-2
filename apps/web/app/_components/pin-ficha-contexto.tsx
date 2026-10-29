"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { PinDiferido as BotonFijar } from "@opai/ds";

/** «Fijar» de la ficha abierta: el shell lo ofrece y el menú ⋯ de la ficha lo usa bajo 1024 px (CAR-65). */
export type PinFicha = { fijado: boolean; onFijar: () => void };

export const PinFichaContexto = createContext<PinFicha | null>(null);

export const usePinFicha = () => useContext(PinFichaContexto);

/** Verdadero bajo 1024 px (teléfono e iPad vertical), donde «Fijar» vive en el menú ⋯. Falso hasta montar. */
export function useBajoLg(): boolean {
  const [bajo, setBajo] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const alCambiar = () => setBajo(mq.matches);
    alCambiar();
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, []);
  return bajo;
}

/**
 * «Fijar» de la ficha abierta: botón de la cabecera desde 1024 px (oculto debajo) y la misma acción
 * para el menú ⋯ de la ficha. `null` si la ruta no es una ficha o el usuario no puede fijar.
 */
export function pinDeFicha(
  activo: boolean,
  fijado: boolean | undefined,
  onFijar: (() => Promise<void>) | undefined,
): { boton: ReactNode; menu: PinFicha | null } {
  if (!activo || !onFijar) return { boton: null, menu: null };
  const alFijar = () => void onFijar();
  const boton = (
    <BotonFijar
      variante="ficha"
      fijado={fijado ?? false}
      onFijar={alFijar}
      className="max-lg:hidden"
    />
  );
  return { boton, menu: { fijado: fijado ?? false, onFijar: alFijar } };
}

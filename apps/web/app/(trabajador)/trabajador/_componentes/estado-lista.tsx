import type { ComponentProps, ReactNode } from "react";

import { Estado } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";

import { SIN_FICHA } from "./estado";

/** Estado de las listas del portal trabajador: vacío sin ficha y error con reintento. */
export function EstadoLista({ state, children }: { state: ComponentProps<typeof Estado>["state"]; children: ReactNode }) {
  return (
    <Estado state={state} variante="lista" textos={{ vacio: SIN_FICHA, error: { accion: <BotonReintentar /> } }}>
      {children}
    </Estado>
  );
}

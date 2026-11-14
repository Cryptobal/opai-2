"use client";

import { createContext, type ReactNode, useContext } from "react";

import { useAgenteListo } from "./abrir-agente";

const Disponible = createContext<boolean | null>(null);

/**
 * El shell avisa desde el servidor si la persona tiene el agente (licencia y `agente:usar`), para que
 * las fichas pinten «Preguntar a OPAI» en el primer render y la cabecera no se mueva cuando el panel
 * termina de cargar aparte (CAR-335 D5).
 */
export function AgenteDisponible({
  disponible,
  children,
}: {
  disponible: boolean;
  children: ReactNode;
}) {
  return <Disponible value={disponible}>{children}</Disponible>;
}

/** Verdadero si la persona tiene el agente. Fuera de un shell que lo informe, espera a que el panel escuche. */
export function useHayAgente(): boolean {
  const disponible = useContext(Disponible);
  const listo = useAgenteListo();
  return disponible ?? listo;
}

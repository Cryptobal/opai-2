"use client";

import { useParametros } from "@/app/_components/maestros/use-url";

/**
 * Hoja de un negocio abierta por la URL (`?ganar=1`, `?mover=<etapaId>`). Cerrar quita su parámetro
 * y, en el tablero, también `?negocio=`, al instante (historial del navegador, sin viaje al servidor).
 */
export function useHojaNegocio(param: string) {
  const v = useParametros().valor(param);
  return {
    abierta: v !== null,
    valor: v,
    cerrar: () => {
      const u = new URL(location.href);
      u.searchParams.delete(param);
      u.searchParams.delete("negocio");
      u.searchParams.delete("cuenta");
      history.replaceState(null, "", u);
    },
  };
}

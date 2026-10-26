"use client";

import { useSyncExternalStore } from "react";

/**
 * Destino de la navegación en curso (ADR-045), fuera de React para que el shell lo lea sin acoplar.
 * `useLinkStatus` de cada enlace del menú lo fija al empezar su navegación y lo limpia al terminar;
 * el shell marca el ítem del riel y pone el título de destino de inmediato, sin esperar a que el
 * contenido nuevo se renderice (así el título viejo no queda encima del contenido nuevo).
 */
let pendiente: string | null = null;
const oyentes = new Set<() => void>();

export function fijarPendiente(href: string | null): void {
  if (pendiente === href) return;
  pendiente = href;
  for (const avisar of oyentes) avisar();
}

/** Ruta de destino de la navegación en curso, o null si no hay ninguna. */
export function usePendiente(): string | null {
  return useSyncExternalStore(
    (avisar) => {
      oyentes.add(avisar);
      return () => void oyentes.delete(avisar);
    },
    () => pendiente,
    () => null,
  );
}

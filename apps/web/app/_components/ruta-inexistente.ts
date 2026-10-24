import { notFound } from "next/navigation";

/**
 * Página de los catch-all `[...ruta]`: no lee `params`, así que el 404 se decide antes de enviar el
 * HTML y el estado HTTP es 404 (no 200). El `not-found.tsx` del segmento pone el shell del portal.
 */
export function RutaInexistente(): never {
  notFound();
}

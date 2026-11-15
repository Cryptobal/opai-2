import type { Resultado } from "@opai/capabilities";

import {
  ejecutarCapacidad as ejecutarEnServidor,
  type Revalidacion,
} from "@/app/_acciones/capacidad";

/** Evento que vuelve a pedir lo que el navegador carga aparte (pendientes, contadores, Actividad). */
export const EVENTO_CAMBIO = "opai-bandeja";
const ESPERA_MS = 250;
let pendiente: ReturnType<typeof setTimeout> | null = null;

/**
 * Avisa que algo cambió (CAR-338). La página se pone al día sola con la invalidación de la acción;
 * lo que se pide desde el navegador después de pintar (hilo, campana, Bandeja, números del menú) no,
 * y queda viejo hasta recargar. Una ráfaga de escrituras se junta en un solo aviso.
 */
export function avisarCambio(): void {
  if (typeof window === "undefined") return;
  if (pendiente) clearTimeout(pendiente);
  pendiente = setTimeout(() => {
    pendiente = null;
    window.dispatchEvent(new Event(EVENTO_CAMBIO));
  }, ESPERA_MS);
}

/**
 * La acción de servidor de siempre más el aviso tras una escritura real. Las pantallas la importan
 * desde aquí en vez de `@/app/_acciones/capacidad`; con `revalidar: "ninguna"` (preferencias que ya
 * se ven en el cliente) no avisa.
 */
export async function ejecutarCapacidad(
  ...args: Parameters<typeof ejecutarEnServidor>
): Promise<Resultado> {
  const r = await ejecutarEnServidor(...args);
  const revalidar: Revalidacion = args[4] ?? "layout";
  if (r.ok && r.escritura && revalidar !== "ninguna") avisarCambio();
  return r;
}

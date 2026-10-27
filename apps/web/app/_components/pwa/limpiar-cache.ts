/**
 * Limpieza de las cachés del service worker al cerrar sesión o cambiar de empresa (§4.4, §9, CA8).
 * El service worker nunca guarda HTML ni RSC con sesión (solo activos públicos), pero la app borra
 * igual todas sus cachés antes de redirigir: defensa en profundidad para no dejar nada del tenant
 * anterior en el dispositivo. Se verifica con dos usuarios de dos empresas en el mismo navegador.
 *
 * Cuando hay un service worker controlando, se lo pide por mensaje: borra todas las cachés y vuelve
 * a precachear los activos públicos, para que el cascarón offline siga disponible tras limpiar. Sin
 * service worker (modo privado, sin soporte), se borra directo desde la página.
 */

/** El service worker no contesta en este margen → se borra directo desde la página. */
const ESPERA_MS = 3000;

/** Pide al service worker borrar sus cachés y re-precachear; resuelve con su ack. */
function pedirLimpiezaAlSw(sw: ServiceWorker): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const canal = new MessageChannel();
    const tope = setTimeout(() => rechazar(new Error("sin respuesta del service worker")), ESPERA_MS);
    canal.port1.onmessage = () => {
      clearTimeout(tope);
      resolver();
    };
    sw.postMessage({ type: "LIMPIAR_SESION" }, [canal.port2]);
  });
}

/** Borra TODAS las cachés desde la página (sin service worker que re-precachee). */
async function borrarTodasLasCaches(): Promise<void> {
  const claves = await caches.keys();
  await Promise.all(claves.map((k) => caches.delete(k)));
}

/** Borra TODAS las cachés del service worker. Degrada sin romper si no hay Cache Storage (§10). */
export async function limpiarCachesPwa(): Promise<void> {
  if (typeof caches === "undefined") return;
  const sw = typeof navigator !== "undefined" ? navigator.serviceWorker?.controller : null;
  try {
    if (sw) {
      await pedirLimpiezaAlSw(sw);
      return;
    }
    await borrarTodasLasCaches();
  } catch {
    // El service worker no respondió, o no hay Cache Storage (modo privado): último intento directo.
    await borrarTodasLasCaches().catch(() => undefined);
  }
}

/** Limpia las cachés y, pase lo que pase con la limpieza, ejecuta la acción (salir / cambiar empresa). */
export function trasLimpiarCaches(accion: () => unknown): void {
  void limpiarCachesPwa().finally(() => {
    void accion();
  });
}

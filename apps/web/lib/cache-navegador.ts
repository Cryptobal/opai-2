/**
 * Tiempo de caché del navegador (Router Cache, `staleTimes`), en un solo sitio (ADR-045).
 * Decisión de Carlos (24-oct): 30 s. Se puede subir cuando la época de sesión entre pestañas y la
 * edad de la caché (`refresco-navegador.ts`) estén dadas por buenas; es el único número a cambiar.
 */
export const CACHE_DINAMICA_S = 30;
/** Una página más vieja que esto (desde que el servidor la generó) se refresca en segundo plano. */
export const REFRESCO_SILENCIOSO_S = CACHE_DINAMICA_S / 2;

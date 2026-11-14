/**
 * Las apps nativas de OPAI (Brief 17) agregan `OPAIApp/<variante>` al user agent. Dentro de la app no
 * hay «agregar a la pantalla de inicio» ni Web Push: el push nativo llega por APNs y FCM.
 */
export function esAppNativa(userAgent: string): boolean {
  return /\bOPAIApp\/[a-z]+\b/.test(userAgent);
}

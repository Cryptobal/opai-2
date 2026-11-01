export type AjusteRef = { modulo: string; clave: string };

/**
 * Dónde vive un campo de ajuste dentro del centro de Configuración, para que la búsqueda (portada y
 * ⌘K) lleve directo a él. Los campos de un módulo van a su pestaña «Ajustes»; los del núcleo, a la
 * entrada del grupo que los agrupa (brief §4.1).
 */
export function destinoAjuste(a: AjusteRef): string {
  if (a.modulo !== "core") return `/configuracion/modulo/${a.modulo}?seccion=ajustes`;
  if (a.clave.startsWith("documentos")) return "/configuracion/documentos";
  if (
    a.clave.startsWith("navegacion") ||
    a.clave.startsWith("preferencias") ||
    a.clave.startsWith("usuario")
  )
    return "/mi-cuenta/preferencias";
  if (a.clave.startsWith("comunicaciones")) return "/configuracion/comunicaciones";
  return "/configuracion/empresa";
}

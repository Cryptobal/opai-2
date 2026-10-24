import { createHash } from "node:crypto";

/**
 * Identifica «quién y en qué empresa» está viendo la página. Cambia al entrar, salir, cambiar de
 * empresa o perder la membresía; las pestañas se avisan esa época y recargan si no coincide.
 * Es un resumen (no el id) para no publicar identificadores en el navegador.
 */
export function epocaDe(usuarioId: string, tenantId: string | null): string {
  return createHash("sha256")
    .update(`${usuarioId}|${tenantId ?? "-"}`)
    .digest("hex")
    .slice(0, 12);
}

import { createHash } from "node:crypto";

import type { Identidad } from "./actor";

const ANONIMA = "anonimo";

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

/**
 * Época de la página según la sesión REAL del request (cookies), no según el tipo de página: así el
 * ERP, el login y el selector de empresa abiertos con las mismas cookies publican la misma época y
 * ninguna pestaña recarga a otra sin que la sesión haya cambiado.
 */
export function epocaDeIdentidad(identidad: Identidad | null): string {
  return identidad ? epocaDe(identidad.usuario.id, identidad.actual?.tenantId ?? null) : ANONIMA;
}

/**
 * Marca de servidor (ms) de cuándo se generó esta vista. El navegador mide su edad para el refresco
 * silencioso (`useRefrescoSilencioso`): tiene que ser hora de servidor, no del cliente. Envuelta en
 * una función para no llamar a `Date.now()` dentro del render de un componente (regla de pureza).
 */
export function marcaGenerado(): number {
  return Date.now();
}

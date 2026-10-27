import { createHash } from "node:crypto";
import { cache } from "react";

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
 * silencioso (`useRefrescoSilencioso`): tiene que ser hora de servidor, no del cliente.
 *
 * Memoizada por request con `cache()`: así devuelve el MISMO valor en cada render del request. Sin
 * esto, `Date.now()` cambiaba entre los dos pases de render que hace Cache Components para validar el
 * prerender; esa impureza rompía la reconciliación del cliente al navegar (el router pedía el RSC del
 * destino una y otra vez y nunca aplicaba la navegación: la página se quedaba en la anterior).
 */
export const marcaGenerado = cache((): number => Date.now());

import { cookies } from "next/headers";

import { COOKIE_MENU, type Marco, marcoResuelto, menuPlegadoDeCookie } from "./marco";
import { anchoMenuDeCookie, COOKIE_ANCHO_MENU } from "./menu-ancho";

/**
 * Marco de esta petición (ADR-090): lo usan el layout del portal y las páginas que cambian con el
 * marco, para que nunca discrepen. Fuera del ERP o sin acceso la cookie ni se lee.
 */
export async function marcoDeLaPeticion(portal: string, acceso: boolean): Promise<Marco> {
  // Sigue siendo asíncrona: quienes la llaman no cambian cuando el marco dependía de la cookie.
  return Promise.resolve(marcoResuelto(portal, acceso));
}

/** Menú lateral plegado del diseño nuevo: solo se lee con ese marco. */
export async function menuPlegadoDeLaPeticion(marco: Marco): Promise<boolean> {
  if (marco !== "nuevo") return false;
  return menuPlegadoDeCookie((await cookies()).get(COOKIE_MENU)?.value);
}

/** Ancho del menú lateral del diseño nuevo (CAR-442): solo se lee con ese marco. */
export async function anchoMenuDeLaPeticion(marco: Marco): Promise<number | undefined> {
  if (marco !== "nuevo") return undefined;
  return anchoMenuDeCookie((await cookies()).get(COOKIE_ANCHO_MENU)?.value);
}

import { cookies } from "next/headers";

import {
  COOKIE_MARCO,
  COOKIE_MENU,
  type Marco,
  marcoResuelto,
  menuPlegadoDeCookie,
  portalAdmiteHilo,
} from "./marco";

/**
 * Marco de esta petición (ADR-090): lo usan el layout del portal y las páginas que cambian con el
 * marco, para que nunca discrepen. Fuera del ERP o sin acceso la cookie ni se lee.
 */
export async function marcoDeLaPeticion(portal: string, acceso: boolean): Promise<Marco> {
  if (!portalAdmiteHilo(portal, acceso)) return "clasico";
  return marcoResuelto(portal, acceso, (await cookies()).get(COOKIE_MARCO)?.value);
}

/** Menú lateral plegado del diseño nuevo: solo se lee con ese marco. */
export async function menuPlegadoDeLaPeticion(marco: Marco): Promise<boolean> {
  if (marco !== "nuevo") return false;
  return menuPlegadoDeCookie((await cookies()).get(COOKIE_MENU)?.value);
}

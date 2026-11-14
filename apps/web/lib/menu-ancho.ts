/**
 * Ancho del menú lateral del diseño nuevo (CAR-442): se recuerda en una cookie de este navegador que
 * el servidor lee al cargar, así el menú se pinta con su ancho desde el primer byte. Fuera de rango o
 * sin cookie, el ancho base. Los límites son los de `AsaMenu` (`@opai/ds`).
 */
export const COOKIE_ANCHO_MENU = "opai_menu_ancho";
const MIN = 200;
const MAX = 330;

export function anchoMenuDeCookie(valor: string | undefined): number | undefined {
  if (!valor || !/^\d{3}$/.test(valor)) return undefined;
  const ancho = Number(valor);
  return ancho >= MIN && ancho <= MAX ? ancho : undefined;
}

/** Texto para `document.cookie`: el ancho dura un año. */
export function cookieAnchoMenu(ancho: number): string {
  const seguro =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  const valor = Math.min(MAX, Math.max(MIN, Math.round(ancho)));
  return `${COOKIE_ANCHO_MENU}=${valor}; Path=/; Max-Age=31536000; SameSite=Lax${seguro}`;
}

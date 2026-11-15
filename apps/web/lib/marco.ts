/**
 * Marco de la aplicación (ADR-109): el diseño nuevo es el único con empresa. Sin acceso a una
 * empresa (p. ej. Plataforma o «Sin permisos») queda el marco base clásico, que muestra ese aviso.
 * La preferencia y la cookie de marco ya no se leen ni se escriben (CAR-424).
 */
export type Marco = "clasico" | "nuevo";

/**
 * Marco que se monta para un portal y un acceso. Una sola regla para el layout y para las páginas
 * que cambian con el marco (Inicio): nunca deciden por separado.
 */
export function marcoResuelto(_portal: string, acceso: boolean): Marco {
  // CAR-335 D6e: todo portal con empresa usa el diseño nuevo. Sin acceso queda el marco base.
  return acceso ? "nuevo" : "clasico";
}

/**
 * Menú lateral plegado del diseño nuevo (ADR-109, CAR-335 D2b): se recuerda en una cookie de este
 * navegador que el servidor lee para pintar el menú plegado desde el primer byte.
 */
export const COOKIE_MENU = "opai_menu";

export function menuPlegadoDeCookie(valor: string | undefined): boolean {
  return valor === "plegado";
}

/** Texto para `document.cookie`: plegado dura un año; abierto (lo normal) es la ausencia. */
export function cookieMenu(plegado: boolean): string {
  const seguro =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_MENU}=${plegado ? "plegado" : ""}; Path=/; Max-Age=${plegado ? 31_536_000 : 0}; SameSite=Lax${seguro}`;
}

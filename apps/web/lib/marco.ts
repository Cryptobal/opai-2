/**
 * Marco de la aplicación (ADR-090, CAR-278): el clásico (menú lateral) o el Hilo. Sigue el mecanismo
 * del tema: la elección se guarda como preferencia de la persona (`core.preferencias_marco`) y rige
 * en cada navegador por una cookie, que es lo único que el servidor lee para pintar el marco elegido
 * desde el primer byte, sin consultas ni parpadeo. Mientras conviven los dos marcos no se sincroniza
 * entre dispositivos: se puede probar el Hilo en el computador y seguir con el clásico en el teléfono.
 * No es un permiso: quien cambie la cookie a mano solo cambia su propio marco.
 */
/**
 * «nuevo» es el diseño de ADR-109 y, desde CAR-335 D6, el predeterminado: sin cookie se ve el nuevo.
 * El clásico y el Hilo quedan elegibles en Preferencias hasta que se retiren (D6c).
 */
export type Marco = "clasico" | "hilo" | "nuevo";

export const COOKIE_MARCO = "opai_marco";

export function marcoDeCookie(valor: string | undefined): Marco {
  return valor === "hilo" || valor === "clasico" ? valor : "nuevo";
}

/**
 * Marco que se monta para un portal, un acceso y el valor de la cookie. Una sola regla para el layout
 * y para las páginas que cambian con el marco (Inicio, Preferencias): nunca deciden por separado.
 */
/**
 * Portales de terreno (trabajador y terreno) con su propia barra inferior (marcar, rondas) y su tope de
 * JS de PWA (ADR-044): pasan al diseño nuevo en su propio bloque, con su barra rediseñada.
 */
const PORTALES_TERRENO = new Set(["trabajador", "terreno"]);

export function marcoResuelto(portal: string, acceso: boolean): Marco {
  // CAR-335 D6: el diseño nuevo es el único en el ERP y en los portales de oficina (supervisor,
  // cliente). Sin acceso a una empresa (p. ej. Plataforma o «Sin permisos») queda el marco base, que
  // es el que muestra ese aviso.
  return acceso && !PORTALES_TERRENO.has(portal) ? "nuevo" : "clasico";
}

/** Texto para `document.cookie`: un año para el clásico y el Hilo; el nuevo es la ausencia de la cookie. */
export function cookieMarco(marco: Marco): string {
  const seguro =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  const guardado = marco === "nuevo" ? "" : marco;
  return `${COOKIE_MARCO}=${guardado}; Path=/; Max-Age=${guardado ? 31_536_000 : 0}; SameSite=Lax${seguro}`;
}

/**
 * Menú lateral plegado del diseño nuevo (ADR-109, CAR-335 D2b): como el marco, se recuerda en una
 * cookie de este navegador que el servidor lee para pintar el menú plegado desde el primer byte.
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

/** Planillas: pantallas que necesitan todo el ancho, donde el hilo va plegado en el riel. */
const ANCHAS = ["/pauta", "/asistencia", "/finanzas/flujo"] as const;

export function rutaAncha(ruta: string): boolean {
  return ANCHAS.some((base) => ruta === base || ruta.startsWith(`${base}/`));
}

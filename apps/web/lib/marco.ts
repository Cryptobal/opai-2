/**
 * Marco de la aplicación (ADR-090, CAR-278): el clásico (menú lateral) o el Hilo. Sigue el mecanismo
 * del tema: la elección se guarda como preferencia de la persona (`core.preferencias_marco`) y rige
 * en cada navegador por una cookie, que es lo único que el servidor lee para pintar el marco elegido
 * desde el primer byte, sin consultas ni parpadeo. Mientras conviven los dos marcos no se sincroniza
 * entre dispositivos: se puede probar el Hilo en el computador y seguir con el clásico en el teléfono.
 * No es un permiso: quien cambie la cookie a mano solo cambia su propio marco.
 */
export type Marco = "clasico" | "hilo";

export const COOKIE_MARCO = "opai_marco";

export function marcoDeCookie(valor: string | undefined): Marco {
  return valor === "hilo" ? "hilo" : "clasico";
}

/** En esta etapa (H1) el Hilo existe solo en el ERP y con acceso a la empresa actual. */
export function portalAdmiteHilo(portal: string, acceso: boolean): boolean {
  return portal === "erp" && acceso;
}

/** Texto para `document.cookie`: un año para Hilo; el clásico es la ausencia de la cookie. */
export function cookieMarco(marco: Marco): string {
  const seguro = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_MARCO}=${marco === "hilo" ? "hilo" : ""}; Path=/; Max-Age=${marco === "hilo" ? 31_536_000 : 0}; SameSite=Lax${seguro}`;
}

/** Planillas: pantallas que necesitan todo el ancho, donde el hilo va plegado en el riel. */
const ANCHAS = ["/pauta", "/asistencia", "/finanzas/flujo"] as const;

export function rutaAncha(ruta: string): boolean {
  return ANCHAS.some((base) => ruta === base || ruta.startsWith(`${base}/`));
}

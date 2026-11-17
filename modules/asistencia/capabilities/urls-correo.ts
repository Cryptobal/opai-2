/** Rutas públicas usadas en correos del módulo (deben existir en `apps/web`). */
export const RUTAS_CORREO_ASISTENCIA = [
  "/trabajador/marcar",
  "/trabajador/contingencias",
  "/correccion/",
  "/contingencia/",
  "/verificar/marca/",
  "/personas/",
] as const;

export function urlPortalMarcar(urlBase: string): string {
  return `${urlBase}/trabajador/marcar`;
}

export function urlPortalContingencias(urlBase: string): string {
  return `${urlBase}/trabajador/contingencias`;
}

export function urlContingenciaEnlace(urlBase: string, slug: string, token: string): string {
  return `${urlBase}/contingencia/${slug}/${token}`;
}
/**
 * Candado de ambiente tributario (CAR-191, ADR de Finanzas bloque 0).
 *
 * La producción del SII (emisión real, envío y cesión efectiva con Octava) solo está habilitada en el
 * despliegue de app.opai.cl. En cualquier otro host (test.opai.cl, previews, local) el ambiente efectivo
 * es siempre «certificación», aunque la empresa haya guardado «producción». Falla cerrado.
 */

/** Host del único despliegue autorizado a operar en producción tributaria. */
export const HOST_PRODUCCION_TRIBUTARIA = "app.opai.cl";

/** Valor que la variable debe tener para habilitar producción. */
export const VALOR_PRODUCCION_HABILITADA = "habilitada";

export type AmbienteTributario = "certificacion" | "produccion";

type EnvTributario = Readonly<Record<string, string | undefined>>;

function hostDe(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * true solo si `OPAI_PRODUCCION_TRIBUTARIA` vale «habilitada», el despliegue es el de producción de Vercel
 * (`VERCEL_ENV=production`, así una vista previa con las mismas variables nunca emite de verdad) Y el host de
 * `BETTER_AUTH_URL` es app.opai.cl. Variable ausente, otro entorno, host distinto o URL ilegible: false.
 */
export function produccionTributariaHabilitada(env: EnvTributario = process.env): boolean {
  if (env.OPAI_PRODUCCION_TRIBUTARIA !== VALOR_PRODUCCION_HABILITADA) return false;
  if (env.VERCEL_ENV !== "production") return false;
  return hostDe(env.BETTER_AUTH_URL) === HOST_PRODUCCION_TRIBUTARIA;
}

/** Ambiente que de verdad se usa: «producción» solo si está configurado y el entorno lo habilita. */
export function ambienteTributarioEfectivo(
  configurado: string | null | undefined,
  env: EnvTributario = process.env,
): AmbienteTributario {
  if (configurado === "produccion" && produccionTributariaHabilitada(env)) return "produccion";
  return "certificacion";
}

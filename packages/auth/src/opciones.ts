// Opciones de Better Auth que no dependen de la base ni de Next (ADR-015). Se separan para poder
// testearlas y reutilizarlas en el cliente (inferencia de campos adicionales).

/** Mínimo de 10 caracteres (Brief 01, sección 9). */
export const LARGO_MINIMO_PASSWORD = 10;

/** Enlaces de recuperación e invitación: 72 horas, un solo uso, solo hash en base. */
export const VIGENCIA_ENLACE_SEGUNDOS = 72 * 60 * 60;

/** Campos propios en `users`. `platformRole` nunca se acepta desde el cliente. */
export const camposUsuario = {
  platformRole: { type: "string", required: false, input: false },
} as const;

/** Orígenes de confianza: la URL pública y, fuera de producción, localhost. */
export function origenesConfiables(env: Record<string, string | undefined>): string[] {
  const origenes = [env["BETTER_AUTH_URL"]].filter((o): o is string => Boolean(o));
  if (env["NODE_ENV"] !== "production") origenes.push("http://localhost:3000");
  return origenes;
}

/** Google solo si existen credenciales. Nunca crea usuarios: se entra por invitación. */
export function proveedoresSociales(env: Record<string, string | undefined>) {
  const clientId = env["GOOGLE_CLIENT_ID"];
  const clientSecret = env["GOOGLE_CLIENT_SECRET"];
  if (!clientId || !clientSecret) return {};
  return { google: { clientId, clientSecret, disableSignUp: true } };
}

export function googleHabilitado(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env["GOOGLE_CLIENT_ID"] && env["GOOGLE_CLIENT_SECRET"]);
}

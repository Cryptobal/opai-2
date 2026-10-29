/**
 * ¿Es un entorno desplegado (Vercel production o preview, o un build de producción)? Ahí los logs
 * van a Vercel y el correo nunca cae a la consola (CAR-51).
 */
export function entornoDesplegado(env: Record<string, string | undefined>): boolean {
  const vercel = env["VERCEL_ENV"];
  return vercel === "production" || vercel === "preview" || env["NODE_ENV"] === "production";
}

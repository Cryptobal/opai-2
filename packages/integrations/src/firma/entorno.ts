/**
 * ¿El entorno admite el sellador falso (sin prestador, P7)? Solo pruebas y desarrollo local: fuera de
 * ahí (producción, preview o cualquier NODE_ENV que no sea `test`/`development`) el sello falla
 * cerrado, para no marcar un documento como firmado con un PDF que no es un sello real (B1).
 */
export function entornoAdmiteSelloFalso(env: Record<string, string | undefined>): boolean {
  return env["NODE_ENV"] === "test" || env["NODE_ENV"] === "development";
}

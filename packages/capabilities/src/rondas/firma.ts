import { randomBytes } from "node:crypto";

import { componerEtiqueta, verificarEtiqueta, type VerificacionEtiqueta } from "@opai/domain";

/**
 * Firma de etiquetas QR de 2.0 (R7). La clave es un secreto de OPAI (no del tenant): se lee de
 * `RONDAS_ETIQUETA_SECRET` o, por defecto, de `BETTER_AUTH_SECRET` (estable entre instancias de
 * Vercel, como el salt del rate limit). No es una credencial de integración de tenant: no pasa por el
 * catálogo del núcleo (ADR-027), no sale por API ni MCP y nunca se imprime. El identificador opaco es
 * azar local; la firma la calcula el dominio puro.
 */
function clave(): string {
  return (
    process.env["RONDAS_ETIQUETA_SECRET"] ??
    process.env["BETTER_AUTH_SECRET"] ??
    "opai::rondas::etiqueta::sal-dev"
  );
}

/** Genera una etiqueta opaca y firmada nueva: `R2.<idOpaco>.<firma>` (R7). */
export function generarEtiquetaFirmada(): { codigo: string; idOpaco: string } {
  const idOpaco = randomBytes(16).toString("base64url");
  return { codigo: componerEtiqueta(idOpaco, clave()), idOpaco };
}

/** Verifica un código leído con la clave vigente (R7, R8). */
export function verificarEtiquetaFirmada(codigo: string): VerificacionEtiqueta {
  return verificarEtiqueta(codigo, clave());
}

import { hkdfSync, randomBytes } from "node:crypto";

import {
  componerEtiqueta,
  KID_ETIQUETA_DEFECTO,
  verificarEtiqueta,
  type VerificacionEtiqueta,
} from "@opai/domain";

import { reglaDeNegocio } from "../errores";

/** Largo mínimo del secreto base, en bytes (corrección de la review 5713377140 del PR #145). */
const SECRETO_MIN_BYTES = 32;

/**
 * Info de la derivación HKDF: separa este uso (firmar etiquetas QR de Rondas) de cualquier otro uso
 * futuro del mismo secreto base y queda atada a la versión de clave vigente (`KID_ETIQUETA_DEFECTO`),
 * para que rotar de v1 a v2 derive una clave distinta sin tocar `RONDAS_ETIQUETA_SECRET`.
 */
const HKDF_INFO = `opai/rondas/etiqueta/${KID_ETIQUETA_DEFECTO}`;
const HKDF_LARGO_BYTES = 32;

/**
 * Secreto base de OPAI (no del tenant) para firmar etiquetas QR (R7). Es obligatorio y falla cerrado
 * si falta o es muy corto: no hay respaldo a `BETTER_AUTH_SECRET` ni a un valor fijo en el código
 * (bloqueante de la review 5713377140 del PR #145 — reusar el secreto de sesión para otro propósito
 * mezcla dominios de claves, y un valor fijo en producción es una puerta trasera). El único valor fijo
 * que existe es el de prueba, inyectado por los tests (`vi.stubEnv`) o por el entorno de test de CI,
 * nunca por este archivo. No es una credencial de integración de tenant: no pasa por el catálogo del
 * núcleo (ADR-027), no sale por API ni MCP y nunca se imprime.
 */
function secretoBase(): Buffer {
  const valor = process.env["RONDAS_ETIQUETA_SECRET"];
  if (!valor || Buffer.byteLength(valor, "utf8") < SECRETO_MIN_BYTES) {
    throw reglaDeNegocio(
      "RONDAS_ETIQUETA_SECRET no está configurada o tiene menos de 32 bytes: no se generan ni verifican etiquetas QR en este entorno.",
    );
  }
  return Buffer.from(valor, "utf8");
}

/**
 * Clave de firma derivada del secreto base por HKDF-SHA256, con separación de dominio e info
 * versionada (R7): nunca se firma directamente con el secreto base, así que una filtración de esta
 * clave derivada no compromete otro uso del mismo secreto. El identificador opaco es azar local; la
 * firma la calcula el dominio puro.
 */
function clave(): string {
  return Buffer.from(
    hkdfSync("sha256", secretoBase(), new Uint8Array(0), HKDF_INFO, HKDF_LARGO_BYTES),
  ).toString("base64url");
}

/** Genera una etiqueta opaca y firmada nueva: `R2.<kid>.<idOpaco>.<firma>` (R7). */
export function generarEtiquetaFirmada(): { codigo: string; idOpaco: string } {
  const idOpaco = randomBytes(16).toString("base64url");
  return { codigo: componerEtiqueta(idOpaco, clave()), idOpaco };
}

/** Verifica un código leído con la clave vigente (R7, R8). */
export function verificarEtiquetaFirmada(codigo: string): VerificacionEtiqueta {
  return verificarEtiqueta(codigo, clave());
}

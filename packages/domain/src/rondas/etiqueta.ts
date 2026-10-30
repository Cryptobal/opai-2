// Identificador opaco y firmado de una etiqueta QR (Brief 14 · PR 2, R7). Lógica pura: recibe el
// identificador opaco y la clave de firma por parámetro (el azar y el secreto los pone la capa de
// capacidades). Un código de 2.0 es `R2.<idOpaco>.<firma>`, donde la firma es un HMAC-SHA256 del
// identificador opaco con la clave de OPAI: así una etiqueta fabricada a mano no supera la firma y no
// hace falta la base para descartarla. Las etiquetas de 1.0 que se reutilizan durante la migración
// NO llevan este formato (son su código físico actual, sin firma); `verificarEtiqueta` las reconoce
// como «no firmadas» y su validez la decide la base, no la firma (decisión de Carlos, pregunta 20).
import { createHmac, timingSafeEqual } from "node:crypto";

/** Prefijo de una etiqueta firmada de 2.0; distingue el formato nuevo del código físico de 1.0. */
export const PREFIJO_ETIQUETA = "R2";

/** Largo de la firma en caracteres base64url (~96 bits): infabricable sin la clave. */
export const LARGO_FIRMA = 16;

/** Firma base64url (truncada) del identificador opaco con la clave de OPAI. */
export function firmaEtiqueta(idOpaco: string, clave: string): string {
  return createHmac("sha256", clave).update(idOpaco).digest("base64url").slice(0, LARGO_FIRMA);
}

/** Compone el código impreso: `R2.<idOpaco>.<firma>` (R7). */
export function componerEtiqueta(idOpaco: string, clave: string): string {
  return `${PREFIJO_ETIQUETA}.${idOpaco}.${firmaEtiqueta(idOpaco, clave)}`;
}

/** Comparación de cadenas en tiempo constante (no revela cuántos caracteres coinciden). */
function igualSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export type VerificacionEtiqueta = {
  /** El código dice ser una etiqueta firmada de 2.0 (prefijo y tres partes). */
  firmada: boolean;
  /** La firma coincide con la clave (solo tiene sentido si `firmada`). */
  valida: boolean;
  /** El identificador opaco si la firma es válida; `null` en otro caso. */
  idOpaco: string | null;
};

/**
 * Verifica un código leído (R7, R8). Un código de 2.0 (`R2.<id>.<firma>`) se da por `firmada` y se
 * valida con la clave; cualquier otro (el código físico de 1.0 reutilizado) es `firmada: false` y su
 * validez la decide quien consulte la base, no la firma.
 */
export function verificarEtiqueta(codigo: string, clave: string): VerificacionEtiqueta {
  const partes = codigo.split(".");
  if (partes.length !== 3 || partes[0] !== PREFIJO_ETIQUETA) {
    return { firmada: false, valida: false, idOpaco: null };
  }
  const idOpaco = partes[1] as string;
  const firma = partes[2] as string;
  const valida = idOpaco.length > 0 && igualSeguro(firma, firmaEtiqueta(idOpaco, clave));
  return { firmada: true, valida, idOpaco: valida ? idOpaco : null };
}

/** `true` si el código tiene el formato firmado de 2.0 (sin verificar la clave). */
export function esEtiquetaFirmada(codigo: string): boolean {
  const partes = codigo.split(".");
  return partes.length === 3 && partes[0] === PREFIJO_ETIQUETA && (partes[1]?.length ?? 0) > 0;
}

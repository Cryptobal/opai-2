// Identificador opaco y firmado de una etiqueta QR (Brief 14 · PR 2, R7). Lógica pura: recibe el
// identificador opaco y la clave de firma por parámetro (el azar, el secreto y su derivación los
// pone la capa de capacidades, `rondas/firma.ts`). Un código de 2.0 es `R2.<kid>.<idOpaco>.<firma>`,
// donde `kid` es la versión de la clave que firmó (para poder rotarla después sin invalidar en
// silencio el historial, corrección de la review 5713377140 del PR #145) y la firma es un
// HMAC-SHA256 del par `kid:idOpaco` con la clave de OPAI vigente para esa versión: así una etiqueta
// fabricada a mano, o con el `kid` cambiado a mano, no supera la firma y no hace falta la base para
// descartarla. Las etiquetas de 1.0 que se reutilizan durante la migración NO llevan este formato
// (son su código físico actual, sin firma); `verificarEtiqueta` las reconoce como «no firmadas» y su
// validez la decide la base, no la firma (decisión de Carlos, pregunta 20).
import { createHmac, timingSafeEqual } from "node:crypto";

/** Prefijo de una etiqueta firmada de 2.0; distingue el formato nuevo del código físico de 1.0. */
export const PREFIJO_ETIQUETA = "R2";

/** Versión de clave por defecto (kid) de las etiquetas firmadas hoy; sube al rotar la clave. */
export const KID_ETIQUETA_DEFECTO = "v1";

/** Largo de la firma en caracteres base64url (~96 bits): infabricable sin la clave. */
export const LARGO_FIRMA = 16;

/** Firma base64url (truncada) del par `kid:idOpaco` con la clave de OPAI de esa versión. */
export function firmaEtiqueta(idOpaco: string, clave: string, kid: string = KID_ETIQUETA_DEFECTO): string {
  return createHmac("sha256", clave)
    .update(`${kid}:${idOpaco}`)
    .digest("base64url")
    .slice(0, LARGO_FIRMA);
}

/** Compone el código impreso: `R2.<kid>.<idOpaco>.<firma>` (R7). */
export function componerEtiqueta(
  idOpaco: string,
  clave: string,
  kid: string = KID_ETIQUETA_DEFECTO,
): string {
  return `${PREFIJO_ETIQUETA}.${kid}.${idOpaco}.${firmaEtiqueta(idOpaco, clave, kid)}`;
}

/** Comparación de cadenas en tiempo constante (no revela cuántos caracteres coinciden). */
function igualSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export type VerificacionEtiqueta = {
  /** El código dice ser una etiqueta firmada de 2.0 (prefijo y cuatro partes). */
  firmada: boolean;
  /** La firma coincide con la clave de ese `kid` (solo tiene sentido si `firmada`). */
  valida: boolean;
  /** El identificador opaco si la firma es válida; `null` en otro caso. */
  idOpaco: string | null;
};

/**
 * Verifica un código leído (R7, R8) con la clave de la versión (`kid`) vigente para el llamador. Un
 * código de 2.0 (`R2.<kid>.<id>.<firma>`) se da por `firmada` y se valida con `clave`, que debe ser
 * la que corresponde a ese `kid` (si el código quedó firmado con una versión de clave que `clave` no
 * cubre, la firma no valida, igual que una clave equivocada); cualquier otro código (el físico de 1.0
 * reutilizado) es `firmada: false` y su validez la decide quien consulte la base, no la firma.
 */
export function verificarEtiqueta(codigo: string, clave: string): VerificacionEtiqueta {
  const partes = codigo.split(".");
  if (partes.length !== 4 || partes[0] !== PREFIJO_ETIQUETA) {
    return { firmada: false, valida: false, idOpaco: null };
  }
  const kid = partes[1] as string;
  const idOpaco = partes[2] as string;
  const firma = partes[3] as string;
  const valida = idOpaco.length > 0 && igualSeguro(firma, firmaEtiqueta(idOpaco, clave, kid));
  return { firmada: true, valida, idOpaco: valida ? idOpaco : null };
}

/** `true` si el código tiene el formato firmado de 2.0 (sin verificar la clave). */
export function esEtiquetaFirmada(codigo: string): boolean {
  const partes = codigo.split(".");
  return (
    partes.length === 4 &&
    partes[0] === PREFIJO_ETIQUETA &&
    (partes[1]?.length ?? 0) > 0 &&
    (partes[2]?.length ?? 0) > 0
  );
}

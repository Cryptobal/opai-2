/** Tamaño máximo del binario de cartola (5 MiB). */
export const CARTOLA_MAX_BYTES = 5 * 1024 * 1024;

/** Tope de filas de movimiento por importación (incluye cabeceras y metadatos). */
export const CARTOLA_MAX_FILAS = 20_000;

/** Tope del texto CSV descomprimido (10 MiB). */
export const CARTOLA_MAX_TEXTO_UTF8 = 10 * 1024 * 1024;

export function validarTamanoCartola(bytes: number): void {
  if (bytes > CARTOLA_MAX_BYTES) {
    throw new Error("La cartola supera el máximo de 5 MB.");
  }
}

export function validarTextoCartola(texto: string): void {
  if (texto.length > CARTOLA_MAX_TEXTO_UTF8) {
    throw new Error("La cartola descomprimida supera el máximo de 10 MB.");
  }
  const bytes = new TextEncoder().encode(texto).byteLength;
  if (bytes > CARTOLA_MAX_TEXTO_UTF8) {
    throw new Error("La cartola descomprimida supera el máximo de 10 MB.");
  }
}

export const CARTOLA_MAX_BASE64 = 7_000_000;

export function validarFilasCartola(filas: number): void {
  if (filas > CARTOLA_MAX_FILAS) {
    throw new Error(`La cartola supera el máximo de ${CARTOLA_MAX_FILAS} filas.`);
  }
}

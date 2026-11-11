// Bytes del CAF guardado (CAR-240). El CAF del SII es ISO-8859-1 y su firma cubre esos bytes: se guarda tal cual
// (latin1, un byte por carácter) y se lee igual, nunca decodificado como UTF-8 (ADR-075). Los CAF cargados antes de
// este cambio quedaron guardados como UTF-8 del mismo texto latin1; se reconocen y se leen sin perder un byte.

/** U+FFFD en UTF-8: el rastro de un CAF ISO-8859-1 que alguien leyó como UTF-8 antes de guardarlo. */
const REEMPLAZO_UTF8 = Buffer.from([0xef, 0xbf, 0xbd]);

/** Cómo quedó guardado el CAF: solo dice la forma, nunca el contenido. */
export type FormatoCafGuardado = "ascii" | "latin1" | "utf8-anterior" | "danado";

export type DiagnosticoCaf = {
  formato: FormatoCafGuardado;
  /** `Buffer.from(raw.toString("utf8"), "latin1").equals(raw)`: verdadero en un CAF ASCII o latin1 sin tildes. */
  idaYVueltaUtf8Latin1: boolean;
  /** El contenido trae U+FFFD (tildes o eñes perdidas al cargarlo). */
  tieneReemplazo: boolean;
};

/** El XML del CAF (un carácter por byte) en los bytes que se guardan; null si trae caracteres fuera de ISO-8859-1. */
export function bytesCafParaGuardar(xml: string): Buffer | null {
  for (let i = 0; i < xml.length; i += 1) {
    if (xml.charCodeAt(i) > 0xff) return null;
  }
  return Buffer.from(xml, "latin1");
}

const esAscii = (b: Buffer) => b.every((x) => x < 0x80);

function utf8Estricto(b: Buffer): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(b);
  } catch {
    return null;
  }
}

/** Diagnóstico de solo lectura del CAF guardado; no expone ni un carácter del XML. */
export function diagnosticarCafGuardado(bytes: Uint8Array): DiagnosticoCaf {
  const b = Buffer.from(bytes);
  const tieneReemplazo = b.includes(REEMPLAZO_UTF8);
  const idaYVueltaUtf8Latin1 = Buffer.from(b.toString("utf8"), "latin1").equals(b);
  if (esAscii(b)) return { formato: "ascii", idaYVueltaUtf8Latin1, tieneReemplazo };
  const texto = utf8Estricto(b);
  // Un ISO-8859-1 con tildes o eñes casi nunca es UTF-8 válido (0xF1 seguido de una letra no lo es): son bytes crudos.
  if (texto === null) return { formato: "latin1", idaYVueltaUtf8Latin1, tieneReemplazo };
  // UTF-8 válido: el formato anterior (CAF cargados antes de este cambio). Íntegro si cada carácter cabe en un byte
  // y no hay U+FFFD.
  const cabe = [...texto].every((c) => (c.codePointAt(0) ?? 0) <= 0xff);
  return { formato: cabe && !tieneReemplazo ? "utf8-anterior" : "danado", idaYVueltaUtf8Latin1, tieneReemplazo };
}

/**
 * El XML del CAF guardado como texto latin1 (un carácter por byte), listo para `bytesDeXml`; null si está dañado. Así
 * los bytes que llegan a SimpleAPI son los del archivo que entregó el SII.
 */
export function cafXmlDesdeGuardado(bytes: Uint8Array): string | null {
  const b = Buffer.from(bytes);
  const { formato } = diagnosticarCafGuardado(b);
  if (formato === "danado") return null;
  return formato === "utf8-anterior" ? b.toString("utf8") : b.toString("latin1");
}

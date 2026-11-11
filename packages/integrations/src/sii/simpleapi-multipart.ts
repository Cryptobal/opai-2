// Cuerpo multipart/form-data para SimpleAPI, igual al que envía OPAI 1.0, que sí emite (CAR-240): el campo `input`
// es JSON en ISO-8859-1 con su propio Content-Type, y cada archivo va con el nombre de campo `file` (certificado .pfx
// y luego el CAF o el XML), en sus bytes originales. Se arma a mano porque `FormData` no deja fijar el Content-Type
// de un campo de texto ni su codificación.
import { randomUUID } from "node:crypto";

export type ParteMultipart =
  | { nombre: string; texto: string }
  | { nombre: string; bytes: Uint8Array; tipo: string; nombreArchivo: string };

/**
 * Deja el JSON de `input` representable en ISO-8859-1 (como `sanitizeJsonStringForSimpleApiLatin1` de 1.0): la
 * tipografía «linda» pasa a ASCII, los caracteres con tilde fuera de Latin-1 pierden la tilde y lo demás queda en «?».
 * Sin esto, `Buffer.from(json, "latin1")` trunca cada carácter > U+00FF a un byte y rompe el JSON.
 */
export function sanitizarJsonLatin1(json: string): string {
  const s = json
    .replace(/[—–]/g, "-")
    .replace(/[‘’′]/g, "'")
    .replace(/[“”″]/g, '\\"')
    .replace(/…/g, "...")
    .replace(/\u00a0/g, " ");
  let out = "";
  for (const ch of s) {
    if ((ch.codePointAt(0) ?? 0) <= 0xff) {
      out += ch;
      continue;
    }
    const base = ch.normalize("NFD").replace(/\p{M}/gu, "");
    out += base.length > 0 && [...base].every((c) => (c.codePointAt(0) ?? 0) <= 0xff) ? base : "?";
  }
  return out;
}

/** El texto viaja en ISO-8859-1 sin que el saneamiento lo cambie (p. ej. la clave del certificado). */
export function viajaIntactoEnLatin1(texto: string): boolean {
  const json = JSON.stringify(texto);
  return sanitizarJsonLatin1(json) === json;
}

/** Arma el cuerpo y su Content-Type (con el boundary). */
export function cuerpoMultipart(partes: readonly ParteMultipart[]): { cuerpo: Buffer; contentType: string } {
  const boundary = `----opai2-simpleapi-${randomUUID()}`;
  const CRLF = "\r\n";
  const trozos: Buffer[] = [];
  for (const p of partes) {
    trozos.push(Buffer.from(`--${boundary}${CRLF}`));
    if ("texto" in p) {
      trozos.push(
        Buffer.from(
          `Content-Disposition: form-data; name="${p.nombre}"${CRLF}` +
            `Content-Type: application/json; charset=ISO-8859-1${CRLF}${CRLF}`,
        ),
      );
      trozos.push(Buffer.from(sanitizarJsonLatin1(p.texto), "latin1"));
    } else {
      trozos.push(
        Buffer.from(
          `Content-Disposition: form-data; name="${p.nombre}"; filename="${p.nombreArchivo}"${CRLF}` +
            `Content-Type: ${p.tipo}${CRLF}${CRLF}`,
        ),
      );
      trozos.push(Buffer.from(p.bytes));
    }
    trozos.push(Buffer.from(CRLF));
  }
  trozos.push(Buffer.from(`--${boundary}--${CRLF}`));
  return { cuerpo: Buffer.concat(trozos), contentType: `multipart/form-data; boundary=${boundary}` };
}

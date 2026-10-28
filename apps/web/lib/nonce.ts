import { construirCsp } from "./cabeceras-seguridad";

/** Nunca se acepta el nonce del navegador: 128 bits nuevos por petición de documento. */
export function cabecerasConNonce(entrada: Headers) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const headers = new Headers(entrada);
  headers.set("x-opai-nonce", nonce);
  const desarrollo = process.env.NODE_ENV === "development";
  const csp = construirCsp(desarrollo);
  // Next lee la CSP de REQUEST para aplicar el mismo nonce a sus scripts de render.
  headers.delete("content-security-policy");
  headers.set("content-security-policy-report-only", construirCsp(desarrollo, nonce));
  // PPR tiene scripts del shell estático sin nonce. La política del navegador conserva
  // unsafe-inline en Report-Only; anunciar nonce aquí lo anularía y generaría falsos reportes.
  // Los atributos de TEMA/SW ya están preparados; endurecer TODO el shell es un paso posterior.
  return { headers, csp };
}

/**
 * Lee el archivo CAF byte a byte: cada byte pasa a un carácter (latin1), como lo espera el servidor (ADR-075), así que
 * al emitir se reconstruyen exactamente los mismos bytes y la firma del CAF sigue valiendo. Antes se leía como UTF-8,
 * que convertía las tildes y eñes de un CAF ISO-8859-1 en U+FFFD (CAR-240). No se usa `readAsText(…, "ISO-8859-1")`
 * porque el navegador lo trata como windows-1252. Nunca se muestra ni se persiste en el cliente.
 */
export async function leerCafXml(archivo: Blob): Promise<string> {
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  let texto = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    texto += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return texto;
}

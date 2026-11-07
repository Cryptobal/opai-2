// El XML de un DTE se maneja en ISO-8859-1 como bytes que no se transcodifican (ADR-075). Dentro de un `string` de
// JavaScript viaja decodificado como latin1: cada byte es un carácter y el camino de ida y vuelta es exacto, así que
// ni el contenido ni la firma cambian. Nunca se usa UTF-8 con un XML de DTE.

/** Bytes → texto latin1 (1 byte = 1 carácter). Para leer campos o pasar el XML por un `string` sin alterarlo. */
export function xmlDesdeBytes(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("latin1");
}

/** Texto latin1 → los mismos bytes que se recibieron. */
export function bytesDeXml(xml: string): Buffer {
  return Buffer.from(xml, "latin1");
}

/** El TED (timbre electrónico) es el elemento <TED …>…</TED> del documento; es lo que se dibuja como PDF417. */
export function extraerTed(xml: string): string | null {
  const m = /<TED[\s>][\s\S]*?<\/TED>/.exec(xml);
  return m ? m[0] : null;
}

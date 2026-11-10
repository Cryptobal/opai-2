// Solo para pruebas: separa un cuerpo multipart/form-data en sus partes, con los bytes intactos (CAR-240).
export type ParteLeida = { nombre: string; archivo: string | null; tipo: string | null; bytes: Buffer };

export function leerMultipart(cuerpo: Uint8Array, contentType: string): ParteLeida[] {
  const boundary = /boundary=(.+)$/.exec(contentType)?.[1];
  if (!boundary) throw new Error("Content-Type sin boundary");
  // latin1 preserva cada byte como un carácter: separar y volver a bytes no altera nada.
  const texto = Buffer.from(cuerpo).toString("latin1");
  const trozos = texto.split(`--${boundary}`);
  if (trozos.at(-1) !== "--\r\n") throw new Error("Falta el cierre del multipart");
  return trozos.slice(1, -1).map((t) => {
    if (!t.startsWith("\r\n") || !t.endsWith("\r\n")) throw new Error("Parte mal delimitada");
    const fin = t.indexOf("\r\n\r\n");
    const cabeceras = t.slice(2, fin);
    const disposicion = /Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/.exec(cabeceras);
    if (!disposicion?.[1]) throw new Error("Parte sin nombre");
    return {
      nombre: disposicion[1],
      archivo: disposicion[2] ?? null,
      tipo: /Content-Type: (.+)/.exec(cabeceras)?.[1] ?? null,
      bytes: Buffer.from(t.slice(fin + 4, -2), "latin1"),
    };
  });
}

/** El texto de la parte `input`, leído como ISO-8859-1 (como lo lee SimpleAPI). */
export function textoInput(partes: readonly ParteLeida[]): string {
  const p = partes.find((x) => x.nombre === "input");
  if (!p) throw new Error("Sin parte input");
  return p.bytes.toString("latin1");
}

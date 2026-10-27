const MAX_IMAGEN = 10 * 1024 * 1024;

/** Solo la URL firmada generada por el adaptador R2; nunca acepta una URL del cliente. */
export async function imagenMarcaPrevia(
  urlFirmada: string,
  mime: string,
  tamano: number,
): Promise<Response> {
  const noEncontrado = () =>
    new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (tamano < 1 || tamano > MAX_IMAGEN || !mime.startsWith("image/")) return noEncontrado();
  try {
    const url = new URL(urlFirmada);
    if (
      url.protocol !== "https:" ||
      !/^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    )
      return noEncontrado();
    const r = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!r.ok || !r.body || Number(r.headers.get("content-length")) > MAX_IMAGEN)
      return noEncontrado();
    const reader = r.body.getReader();
    const partes: Uint8Array[] = [];
    let bytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > tamano || bytes > MAX_IMAGEN) {
          await reader.cancel();
          return noEncontrado();
        }
        partes.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    if (bytes !== tamano) return noEncontrado();
    const cuerpo = new Uint8Array(bytes);
    let offset = 0;
    for (const parte of partes) {
      cuerpo.set(parte, offset);
      offset += parte.byteLength;
    }
    return new Response(cuerpo, {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(bytes),
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        // También seguro si se abre un SVG directamente como documento del origen propio.
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return noEncontrado();
  }
}

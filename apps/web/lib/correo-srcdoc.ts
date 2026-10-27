/** El correo real conserva sus URLs absolutas; la vista previa solo carga imágenes de marca propias. */
export function aislarCorreo(html: string, origen: string): string {
  const url = new URL(origen);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Origen inválido");
  const politica = `default-src 'none'; img-src ${url.origin}/api/marca/ data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'`;
  const meta = `<meta http-equiv="Content-Security-Policy" content="${politica}">`;
  return html.replace(/<html\b[^>]*>/i, (inicio) => `${inicio}<head>${meta}</head>`);
}

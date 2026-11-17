/** Descarga un archivo de texto en el navegador (CSV u otro). */
export function descargarTexto(nombre: string, contenido: string, mime = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contenido], { type: mime }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
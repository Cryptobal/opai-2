function dispararDescarga(nombre: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Descarga en el navegador sin ir al servidor. */
export function descargarTexto(nombre: string, contenido: string, tipo: string) {
  dispararDescarga(nombre, new Blob([contenido], { type: `${tipo};charset=utf-8` }));
}

export function descargarBinario(nombre: string, mime: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  dispararDescarga(nombre, new Blob([bytes], { type: mime }));
}
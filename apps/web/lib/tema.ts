/**
 * Aplica el tema al instante (el DS lee `data-theme` en <html>) y lo recuerda en este dispositivo
 * para el script del layout raíz, que lo aplica antes de pintar en las próximas cargas.
 */
export function aplicarTema(t: string) {
  const html = document.documentElement;
  if (t === "sistema") delete html.dataset["theme"];
  else html.dataset["theme"] = t === "oscuro" ? "dark" : "light";
  try {
    localStorage.setItem("opai_tema", t);
  } catch {
    // Sin almacenamiento (modo privado): el tema vale solo para esta pestaña.
  }
}

/** El tema contrario al que se ve ahora: el fijado en <html> o, si sigue al sistema, el del sistema. */
export function temaContrario(fijado: string | undefined, sistemaOscuro: boolean): "claro" | "oscuro" {
  const oscuro = fijado === "dark" || (fijado !== "light" && sistemaOscuro);
  return oscuro ? "claro" : "oscuro";
}

/**
 * Cómo mostrar un archivo. Un SVG no se abre en línea (puede traer scripts). Un PDF se pinta en
 * iframe; el resto (Word, planilla) no tiene visor en el navegador y se descarga.
 */
export function modoVista(doc: { mime: string; nombre: string }): "imagen" | "pdf" | "otro" {
  const ext = doc.nombre.split(".").pop()?.toLowerCase() ?? "";
  if (doc.mime === "image/svg+xml" || ext === "svg") return "otro";
  if (doc.mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext))
    return "imagen";
  if (doc.mime === "application/pdf" || ext === "pdf") return "pdf";
  return "otro";
}

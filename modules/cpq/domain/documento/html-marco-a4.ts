/** Documento HTML con marco A4 para vista previa en pantalla (sin red ni scripts). */
export function marcoHtmlA4(cuerpo: string): string {
  return [
    "<!DOCTYPE html>",
    '<html lang="es"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    "<style>",
    "html{background:#e8eaed}body{margin:0;padding:16px 8px 32px;font-family:system-ui,sans-serif}",
    ".hoja{width:210mm;min-height:297mm;margin:0 auto 16px;padding:20mm 18mm;background:#fff;",
    "box-shadow:0 2px 8px rgba(0,0,0,.12);box-sizing:border-box;overflow:visible}",
    "@page{size:A4;margin:0}",
    "</style></head><body>",
    `<div class="hoja" role="document">${cuerpo}</div>`,
    "</body></html>",
  ].join("");
}
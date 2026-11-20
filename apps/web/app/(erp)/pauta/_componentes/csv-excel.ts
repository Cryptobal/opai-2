/** Celda segura y descarga CSV con punto y coma (Excel en español). */
function celdaCsv(v: string | number): string {
  const t = typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : String(v);
  return `"${t.replaceAll('"', '""')}"`;
}

export function descargarCsvSemicolon(nombreArchivo: string, lineas: readonly (readonly (string | number)[])[]): void {
  const BOM = String.fromCharCode(0xfeff);
  const texto = `${BOM}${lineas.map((l) => l.map(celdaCsv).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nombreArchivo });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
// PDF mínimo del DTE con timbre PDF417 (representación textual en PR 1; timbre gráfico en PR posterior).

export type PdfDteInput = {
  tipoDte: number;
  folio: number;
  fechaEmision: string;
  emisorRazon: string;
  emisorRut: string;
  receptorRazon: string;
  receptorRut: string;
  neto: number;
  exento: number;
  iva: number;
  total: number;
  timbrePdf417: string;
  glosa?: string;
};

/** Genera bytes PDF 1.4 mínimos (sin dependencias externas). */
export function generarPdfDte(input: PdfDteInput): Uint8Array {
  const lines = [
    `DTE ${input.tipoDte} · Folio ${input.folio}`,
    `Emisor: ${input.emisorRazon} (${input.emisorRut})`,
    `Receptor: ${input.receptorRazon} (${input.receptorRut})`,
    `Fecha: ${input.fechaEmision}`,
    `Neto: $ ${input.neto.toLocaleString("es-CL")}`,
    `Exento: $ ${input.exento.toLocaleString("es-CL")}`,
    `IVA: $ ${input.iva.toLocaleString("es-CL")}`,
    `Total: $ ${input.total.toLocaleString("es-CL")}`,
    input.glosa ? `Glosa: ${input.glosa}` : "",
    `Timbre PDF417: ${input.timbrePdf417}`,
    "Documento generado por OPAI 2.0 (diseño DS 2.0)",
  ].filter(Boolean);
  const text = lines.join("\n");
  const stream = `BT /F1 10 Tf 50 750 Td (${escapePdf(text.replace(/\n/g, ") Tj T* ("))}) Tj ET`;
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj",
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
  ];
  let body = "";
  const offsets: number[] = [0];
  for (const o of objects) {
    offsets.push(body.length);
    body += o + "\n";
  }
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((o) => String(o).padStart(10, "0") + " 00000 n ")
    .join("\n")}\n`;
  const pdf = `%PDF-1.4\n${body}${xref}trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${body.length + xref.length}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function escapePdf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

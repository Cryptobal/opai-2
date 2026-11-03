/** PDF 1.4 mínimo sin dependencias externas (cotizaciones y propuestas CPQ). */

export type LineaPdf = {
  texto: string;
  tamano?: number;
  negrita?: boolean;
  colorRgb?: [number, number, number];
  espacioAntes?: number;
};

export type PaginaPdf = { lineas: LineaPdf[] };

export function componerPdf(paginas: PaginaPdf[], fuenteBase: string): Uint8Array {
  const fontRegular = fuenteBase;
  const fontBold = fuenteBase.includes("Bold") ? fuenteBase : `${fuenteBase}-Bold`;
  const objetos: string[] = [];
  let n = 1;
  objetos.push(`${n} 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj`);
  n += 1;
  const pagesRef = n;
  n += 1;
  const pageKids: string[] = [];

  for (let pi = 0; pi < paginas.length; pi++) {
    const contentRef = n;
    n += 1;
    const pageRef = n;
    n += 1;
    const stream = streamDePagina(paginas[pi]!);
    objetos.push(`${contentRef} 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`);
    objetos.push(
      `${pageRef} 0 obj<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 595 842] /Contents ${contentRef} 0 R /Resources<< /Font<< /F1 ${n} 0 R /F2 ${n + 1} 0 R >> >> >>endobj`,
    );
    pageKids.push(`${pageRef} 0 R`);
  }
  objetos.push(`${pagesRef} 0 obj<< /Type /Pages /Kids [${pageKids.join(" ")}] /Count ${paginas.length} >>endobj`);
  const f1 = n;
  n += 1;
  const f2 = n;
  objetos.push(`${f1} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /${fontRegular} >>endobj`);
  objetos.push(`${f2} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /${fontBold} >>endobj`);

  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const o of objetos) {
    offsets.push(body.length);
    body += `${o}\n`;
  }
  const xrefPos = body.length;
  const xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((o) => `${String(o).padStart(10, "0")} 00000 n `)
    .join("\n")}\n`;
  body += xref;
  body += `trailer<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return new TextEncoder().encode(body);
}

function streamDePagina(pagina: PaginaPdf): string {
  const ops: string[] = [];
  let y = 800;
  for (const l of pagina.lineas) {
    if (l.espacioAntes) y -= l.espacioAntes;
    const size = l.tamano ?? 10;
    if (l.colorRgb) {
      const [r, g, b] = l.colorRgb.map((c) => (c / 255).toFixed(3));
      ops.push(`${r} ${g} ${b} rg`);
    } else {
      ops.push("0 0 0 rg");
    }
    ops.push("BT", `/F${l.negrita ? 2 : 1} ${size} Tf`, `48 ${y} Td`, `(${escPdf(l.texto)}) Tj`, "ET");
    y -= Math.round(size * 1.45);
    if (y < 48) break;
  }
  return ops.join("\n");
}

export function escPdf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function parseColorHex(hex: string | null | undefined): [number, number, number] | undefined {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return undefined;
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

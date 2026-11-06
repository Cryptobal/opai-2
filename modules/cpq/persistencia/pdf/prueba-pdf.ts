/** Utilidades de prueba: texto y geometría de un PDF generado, leídos con pdf.js. */
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function leerPdf(bytes: Uint8Array): Promise<{ paginas: string[]; medidas: { ancho: number; alto: number }[] }> {
  const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const paginas: string[] = [];
  const medidas: { ancho: number; alto: number }[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const p = await pdf.getPage(i);
    const [, , ancho = 0, alto = 0] = p.view;
    medidas.push({ ancho, alto });
    const c = await p.getTextContent();
    paginas.push(c.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return { paginas, medidas };
}

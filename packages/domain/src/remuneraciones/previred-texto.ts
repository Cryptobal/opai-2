// Lectura de texto de la página de indicadores previsionales (CAR-193): HTML → texto plano y cifras chilenas.
import { PCT_ESCALA, UF_ESCALA } from "../dinero";

const ENTIDADES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ",
};

/** Quita scripts, estilos y etiquetas; decodifica entidades y colapsa espacios. */
export function textoPlano(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, nombre: string) => ENTIDADES[nombre] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** «3.712.287» → 3712287. Devuelve null si no es un entero con puntos de miles. */
export function enteroChileno(s: string): number | null {
  if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(s)) return null;
  return Number(s.replace(/\./g, ""));
}

/** «11,44» → 114400 (escala PCT_ESCALA, 1 % = 10.000). Admite hasta cuatro decimales. */
export function porcentajeEscalado(s: string): number | null {
  const m = /^(\d{1,3})(?:,(\d{1,4}))?$/.exec(s);
  if (!m) return null;
  const decimales = (m[2] ?? "").padEnd(4, "0");
  return Number(m[1]) * (PCT_ESCALA / 100) + Number(decimales) * (PCT_ESCALA / 100 / 10_000);
}

/** «135,2» → 1352000 (UF_ESCALA). */
export function ufEscalada(s: string): number | null {
  const m = /^(\d{1,4})(?:,(\d{1,4}))?$/.exec(s);
  if (!m) return null;
  const decimales = (m[2] ?? "").padEnd(4, "0");
  return Number(m[1]) * UF_ESCALA + Number(decimales);
}

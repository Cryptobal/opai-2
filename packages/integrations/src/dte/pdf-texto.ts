// Utilidades de texto para el PDF del DTE. Puras.

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** La fuente estándar solo cubre WinAnsi (Latin-1): lo demás se reemplaza para no romper el PDF. */
export function limpio(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/[\r\n\t]+/g, " ")
    .split("")
    .map((c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) > 255 ? "?" : c))
    .join("")
    .trim();
}

export const pesos = (n: number): string => n.toLocaleString("es-CL");

/** «2026-11-08» → «8 de noviembre de 2026»; si no es una fecha ISO la devuelve tal cual. */
export function fechaLarga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const mes = MESES[Number(m[2]) - 1];
  return mes ? `${Number(m[3])} de ${mes} de ${m[1]}` : iso;
}

export function fechaCorta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

/** Parte un texto en renglones que no pasen de `max` caracteres, cortando en espacios. */
export function renglones(texto: string, max: number): string[] {
  const out: string[] = [];
  let actual = "";
  for (const palabra of limpio(texto).split(" ")) {
    if (actual && `${actual} ${palabra}`.length > max) {
      out.push(actual);
      actual = palabra;
    } else actual = actual ? `${actual} ${palabra}` : palabra;
  }
  if (actual) out.push(actual);
  return out;
}

/** «76123456-7» → «76.123.456-7»; si no tiene la forma de un RUT lo devuelve tal cual. */
export function formatoRut(rut: string): string {
  const m = /^(\d{1,8})-([0-9Kk])$/.exec(rut.replace(/\./g, "").trim());
  return m ? `${(m[1] as string).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${(m[2] as string).toUpperCase()}` : rut;
}

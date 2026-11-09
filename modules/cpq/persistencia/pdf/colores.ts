export type Rgb = readonly [number, number, number];

export const TEXTO: Rgb = [24, 24, 27];
export const TENUE: Rgb = [113, 113, 122];
export const LINEA: Rgb = [228, 228, 231];
export const FONDO_TABLA: Rgb = [244, 244, 245];
export const ACENTO_DEFECTO: Rgb = [30, 41, 59];

/** `#rrggbb` o `#rgb` de la marca del tenant → tupla; si no es válido, el acento por defecto. */
export function acentoDeMarca(hex: string | null | undefined): Rgb {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m?.[1]) return ACENTO_DEFECTO;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  const c = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [c(0), c(2), c(4)];
}

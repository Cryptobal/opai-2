/**
 * Acento del diseño nuevo a partir del color de la empresa (ADR-109, CAR-335 D1; perfil de marca,
 * ADR-028). Cada empresa guarda su color en `core.marca` y la interfaz lo usa como único color de
 * acento. Si ese color no se lee bien sobre los fondos del diseño (WCAG 1.4.3, 4,5:1), se oscurece de
 * día o se aclara de noche conservando el matiz. Sin color válido devuelve null y manda el acento por
 * defecto de `tokens.css`. Función pura: no sabe de React ni de la base de datos.
 */
export interface TonoAcento {
  /** Botones, enlaces, foco y marcas activas. */
  acento: string;
  /** Texto sobre el acento. */
  texto: string;
  /** Fondo suave para etiquetas y filas destacadas. */
  suave: string;
}

export type Modo = "dia" | "noche";

/**
 * Fondos sobre los que se lee el acento, de más claro a más oscuro: fondo, menú lateral y relleno de la
 * piel `[data-marco="nuevo"]`. `packages/ds/src/tokens.test.ts` comprueba que sigan iguales a tokens.css.
 */
export const FONDOS_ACENTO: Record<Modo, readonly string[]> = {
  dia: ["#ffffff", "#fafafa", "#f2f2f2"],
  noche: ["#000000", "#0a0a0a", "#1f1f1f"],
};

const MINIMO = 4.5;
const TEXTO: Record<Modo, string> = { dia: "#ffffff", noche: "#000000" };
const MEZCLA_SUAVE: Record<Modo, number> = { dia: 0.1, noche: 0.12 };

type Rgb = readonly [number, number, number];

function aRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function aHex([r, g, b]: Rgb): string {
  return `#${[r, g, b]
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function luminancia(hex: string): number {
  const lineal = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = aRgb(hex);
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}

/** Razón de contraste WCAG entre dos colores hexadecimales. */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function aHsl([r, g, b]: Rgb): Rgb {
  const [x, y, z] = [r / 255, g / 255, b / 255];
  const max = Math.max(x, y, z);
  const min = Math.min(x, y, z);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === x ? (y - z) / d + (y < z ? 6 : 0) : max === y ? (z - x) / d + 2 : (x - y) / d + 4;
  return [h / 6, s, l];
}

function deHsl([h, s, l]: Rgb): Rgb {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const canal = (t0: number): number => {
    const t = t0 < 0 ? t0 + 1 : t0 > 1 ? t0 - 1 : t0;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [canal(h + 1 / 3) * 255, canal(h) * 255, canal(h - 1 / 3) * 255];
}

const cumple = (color: string, modo: Modo): boolean =>
  FONDOS_ACENTO[modo].every((fondo) => contraste(color, fondo) >= MINIMO) &&
  contraste(color, TEXTO[modo]) >= MINIMO;

function ajustar(hex: string, modo: Modo): string {
  if (cumple(hex, modo)) return hex;
  const [h, s, l0] = aHsl(aRgb(hex));
  const paso = modo === "dia" ? -0.005 : 0.005;
  for (let l = l0 + paso; l >= 0 && l <= 1; l += paso) {
    const candidato = aHex(deHsl([h, s, l]));
    if (cumple(candidato, modo)) return candidato;
  }
  return modo === "dia" ? "#000000" : "#ffffff";
}

function mezclar(color: string, fondo: string, peso: number): string {
  const [ar, ag, ab] = aRgb(color);
  const [br, bg, bb] = aRgb(fondo);
  const m = (x: number, y: number): number => x * peso + y * (1 - peso);
  return aHex([m(ar, br), m(ag, bg), m(ab, bb)]);
}

function tono(hex: string, modo: Modo): TonoAcento {
  const acento = ajustar(hex, modo);
  return {
    acento,
    texto: TEXTO[modo],
    suave: mezclar(acento, FONDOS_ACENTO[modo][0] ?? TEXTO[modo], MEZCLA_SUAVE[modo]),
  };
}

/** Tonos de día y de noche del color de la empresa, o null si no hay un hexadecimal válido. */
export function acentoDeMarca(color: string | null | undefined): Record<Modo, TonoAcento> | null {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return null;
  const hex = color.toLowerCase();
  return { dia: tono(hex, "dia"), noche: tono(hex, "noche") };
}

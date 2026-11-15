/// <reference types="node" />
import { readFileSync } from "node:fs";

// Lectura y contraste de los tokens de tokens.css para las pruebas de cada piel (WCAG 1.4.3 texto
// 4,5:1; 1.4.11 controles 3:1; ADR-050). Lee el archivo real: si alguien cambia un valor, se mide de nuevo.
export const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

export function bloque(inicio: string): Record<string, string> {
  const desde = css.indexOf(inicio);
  if (desde < 0) throw new Error(`Falta el bloque ${inicio}`);
  const abre = css.indexOf("{", desde + inicio.length - 1);
  const cuerpo = css.slice(abre + 1, css.indexOf("}", abre));
  const vars: Record<string, string> = {};
  for (const m of cuerpo.matchAll(/(--ds-[\w-]+):\s*([^;]+);/g)) vars[m[1]!] = m[2]!.trim();
  return vars;
}

export const raiz = bloque(":root {");
export const oscuroSistema = bloque(':root:not([data-theme="light"]) {');
export const oscuroForzado = bloque(':root[data-theme="dark"] {');

export function valor(modo: Record<string, string>, nombre: string): string {
  const v = modo[nombre] ?? raiz[nombre];
  if (!v) throw new Error(`Falta ${nombre}`);
  const ref = /^var\((--ds-[\w-]+)\)$/.exec(v);
  return ref ? valor(modo, ref[1]!) : v;
}

function luminancia(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Color no hexadecimal: ${hex}`);
  const n = parseInt(m[1]!, 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
}

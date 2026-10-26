/// <reference types="node" />
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

// Contraste de los tokens de tokens.css en claro y oscuro (WCAG 1.4.3 texto 4,5:1; 1.4.11 controles
// 3:1; ADR-050). Lee el archivo real: si alguien cambia un valor, el test lo mide de nuevo.
const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

function bloque(inicio: string): Record<string, string> {
  const desde = css.indexOf(inicio);
  if (desde < 0) throw new Error(`Falta el bloque ${inicio}`);
  const abre = css.indexOf("{", desde + inicio.length - 1);
  const cuerpo = css.slice(abre + 1, css.indexOf("}", abre));
  const vars: Record<string, string> = {};
  for (const m of cuerpo.matchAll(/(--ds-[\w-]+):\s*([^;]+);/g)) vars[m[1]!] = m[2]!.trim();
  return vars;
}

const raiz = bloque(":root {");
const oscuroSistema = bloque(':root:not([data-theme="light"]) {');
const oscuroForzado = bloque(':root[data-theme="dark"] {');

function valor(modo: Record<string, string>, nombre: string): string {
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

function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
}

const MODOS = { claro: raiz, oscuro: oscuroForzado } as const;
const NUEVOS = ["--ds-border-control", "--ds-destructive-bg", "--ds-destructive-fg", "--ds-shimmer"];

describe("tokens del DS", () => {
  it("el oscuro del sistema y el oscuro forzado definen los mismos valores", () => {
    expect(oscuroSistema).toEqual(oscuroForzado);
  });

  it("los tokens nuevos existen en claro, en la media query y en [data-theme=dark]", () => {
    for (const t of NUEVOS) {
      expect(raiz[t], `${t} en :root`).toBeDefined();
      expect(oscuroSistema[t], `${t} en la media query`).toBeDefined();
      expect(oscuroForzado[t], `${t} en [data-theme=dark]`).toBeDefined();
    }
  });

  for (const [modo, vars] of Object.entries(MODOS)) {
    const c = (a: string, b: string) => contraste(valor(vars, a), valor(vars, b));

    it(`${modo}: el borde de los controles llega a 3:1 sobre surface y bg (WCAG 1.4.11)`, () => {
      expect(c("--ds-border-control", "--ds-surface")).toBeGreaterThanOrEqual(3);
      expect(c("--ds-border-control", "--ds-bg")).toBeGreaterThanOrEqual(3);
    });

    it(`${modo}: el botón destructivo llega a 4,5:1`, () => {
      expect(c("--ds-destructive-fg", "--ds-destructive-bg")).toBeGreaterThanOrEqual(4.5);
    });

    it(`${modo}: texto y acento llegan a 4,5:1`, () => {
      for (const t of ["--ds-fg", "--ds-fg-muted", "--ds-fg-subtle"]) {
        expect(c(t, "--ds-surface"), `${t} sobre surface`).toBeGreaterThanOrEqual(4.5);
        expect(c(t, "--ds-bg"), `${t} sobre bg`).toBeGreaterThanOrEqual(4.5);
      }
      expect(c("--ds-accent-fg", "--ds-accent")).toBeGreaterThanOrEqual(4.5);
      expect(c("--ds-inverse-fg", "--ds-inverse-bg")).toBeGreaterThanOrEqual(4.5);
    });
  }
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Contraste de los tokens (WCAG 1.4.11: 3:1 en controles; 1.4.3: 4.5:1 en texto), leído de
// tokens.css, el único archivo con valores de color. Los dos temas se leen de sus bloques.
const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

function bloque(inicio: string): string {
  const desde = css.indexOf(inicio);
  expect(desde, inicio).toBeGreaterThanOrEqual(0);
  return css.slice(desde, css.indexOf("\n}", desde));
}

const TEMAS = {
  claro: bloque(":root {"),
  oscuro: bloque(':root[data-theme="dark"] {'),
  oscuroSistema: bloque(':root:not([data-theme="light"]) {'),
} as const;

function valor(tema: string, nombre: string): string {
  const m = new RegExp(`--ds-${nombre}:\\s*([^;]+);`).exec(tema);
  if (!m?.[1]) throw new Error(`Falta --ds-${nombre}`);
  const v = m[1].trim();
  const ref = /^var\(--ds-([a-z-]+)\)$/.exec(v);
  return ref?.[1] ? valor(tema, ref[1]) : v;
}

function luminancia(hex: string): number {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (c[0] ?? 0) + 0.7152 * (c[1] ?? 0) + 0.0722 * (c[2] ?? 0);
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return ((x ?? 0) + 0.05) / ((y ?? 0) + 0.05);
}

describe.each(Object.entries(TEMAS))("tokens · %s", (_nombre, tema) => {
  it("--ds-border-control llega a 3:1 sobre surface y sobre bg", () => {
    const borde = valor(tema, "border-control");
    expect(contraste(borde, valor(tema, "surface"))).toBeGreaterThanOrEqual(3);
    expect(contraste(borde, valor(tema, "bg"))).toBeGreaterThanOrEqual(3);
  });

  it("el botón destructive llega a 4,5:1", () => {
    expect(
      contraste(valor(tema, "destructive-fg"), valor(tema, "destructive-bg")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("define el brillo del skeleton", () => {
    expect(valor(tema, "shimmer")).toMatch(/^rgba\(255, 255, 255, 0?\.\d+\)$/);
  });
});

describe("tokens · coherencia", () => {
  it("el tema oscuro del sistema y el forzado traen los mismos valores", () => {
    for (const n of ["border-control", "destructive-bg", "destructive-fg", "shimmer"]) {
      expect(valor(TEMAS.oscuroSistema, n)).toBe(valor(TEMAS.oscuro, n));
    }
  });

  it("border y border-strong no sirven de borde de control (< 3:1)", () => {
    expect(
      contraste(valor(TEMAS.claro, "border-strong"), valor(TEMAS.claro, "surface")),
    ).toBeLessThan(3);
  });
});

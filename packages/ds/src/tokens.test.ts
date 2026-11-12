import { describe, expect, it } from "vitest";

import { bloque, contraste, css, oscuroForzado, oscuroSistema, raiz, valor } from "./tokens-medir";

const MODOS = { claro: raiz, oscuro: oscuroForzado } as const;
const NUEVOS = [
  "--ds-border-control",
  "--ds-destructive-bg",
  "--ds-destructive-fg",
  "--ds-shimmer",
];

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

// Piel «Hilo» (ADR-090, CAR-278): neutros con alcance `data-marco="hilo"`. El bloque claro va primero
// en el archivo; los oscuros repiten cada token para que el claro no se filtre al tema oscuro.
describe("tokens de la piel Hilo", () => {
  const claro = bloque('[data-marco="hilo"] {');
  const oscuroSis = bloque(':root:not([data-theme="light"]) [data-marco="hilo"] {');
  const oscuroFor = bloque(':root[data-theme="dark"] [data-marco="hilo"] {');
  const HILO = {
    claro: { ...raiz, ...claro },
    oscuro: { ...raiz, ...oscuroForzado, ...oscuroFor },
  } as const;

  it("el oscuro del sistema y el forzado definen lo mismo", () => {
    expect(oscuroSis).toEqual(oscuroFor);
  });

  it("el oscuro repite cada token que cambia el claro", () => {
    for (const t of Object.keys(claro)) expect(oscuroFor[t], `${t} en oscuro`).toBeDefined();
  });

  it("los controles llevan radio de 12 px dentro del marco", () => {
    expect(css).toMatch(/\[data-marco="hilo"\] \{\s*--ds-radius-md:\s*12px;/);
    expect(css).toContain("--radius-md: var(--ds-radius-md);");
  });

  it("usa los neutros del diseño aprobado", () => {
    // Sin hex literales aquí: el único archivo con colores es tokens.css (REGLAS-codigo, UI).
    const hex = (v: string) => `#${v}`;
    expect(claro["--ds-bg"]).toBe(hex("fafaf9"));
    expect(claro["--ds-fg"]).toBe(hex("0d0d0e"));
    expect(oscuroFor["--ds-accent"]).toBe(hex("a9a4ff"));
  });

  for (const [modo, vars] of Object.entries(HILO)) {
    const c = (a: string, b: string) => contraste(valor(vars, a), valor(vars, b));

    it(`${modo}: el texto llega a 4,5:1 sobre surface, bg y fill`, () => {
      for (const t of ["--ds-fg", "--ds-fg-muted", "--ds-fg-subtle"])
        for (const fondo of ["--ds-surface", "--ds-bg", "--ds-fill"])
          expect(c(t, fondo), `${t} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5);
    });

    it(`${modo}: acento, tinta y estados llegan a 4,5:1`, () => {
      expect(c("--ds-accent-fg", "--ds-accent")).toBeGreaterThanOrEqual(4.5);
      expect(c("--ds-accent", "--ds-accent-muted")).toBeGreaterThanOrEqual(4.5);
      expect(c("--ds-bg", "--ds-fg"), "botón de tinta").toBeGreaterThanOrEqual(4.5);
      for (const e of ["success", "warning", "danger"])
        expect(c(`--ds-${e}-fg`, `--ds-${e}-muted`), e).toBeGreaterThanOrEqual(4.5);
    });

    it(`${modo}: el borde de los controles llega a 3:1`, () => {
      expect(c("--ds-border-control", "--ds-surface")).toBeGreaterThanOrEqual(3);
      expect(c("--ds-border-control", "--ds-bg")).toBeGreaterThanOrEqual(3);
    });
  }
});

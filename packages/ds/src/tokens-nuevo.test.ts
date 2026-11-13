import { describe, expect, it } from "vitest";

import { bloque, contraste, css, oscuroForzado, raiz, valor } from "./tokens-medir";

// Piel «diseño nuevo» (ADR-109, CAR-335 D1): blanco y negro con un solo acento. Mismas reglas que Hilo
// y, además, los fondos que usa `acentoDeMarca` (@opai/domain) para ajustar el color de cada empresa.
describe("tokens de la piel nueva", () => {
  const claro = bloque('[data-marco="nuevo"] {');
  const oscuroSis = bloque(':root:not([data-theme="light"]) [data-marco="nuevo"] {');
  const oscuroFor = bloque(':root[data-theme="dark"] [data-marco="nuevo"] {');
  const NUEVO = {
    claro: { ...raiz, ...claro },
    oscuro: { ...raiz, ...oscuroForzado, ...oscuroFor },
  } as const;

  it("el oscuro del sistema y el forzado definen lo mismo", () => {
    expect(oscuroSis).toEqual(oscuroFor);
  });

  it("el oscuro repite cada color que cambia el claro", () => {
    const soloForma = ["--ds-radius-md", "--ds-font-sans", "--ds-font-mono"];
    for (const t of Object.keys(claro).filter((k) => !soloForma.includes(k)))
      expect(oscuroFor[t], `${t} en oscuro`).toBeDefined();
  });

  it("usa Geist y Geist Mono y controles con radio de 8 px", () => {
    expect(claro["--ds-font-sans"]).toContain('"Geist Variable"');
    expect(claro["--ds-font-mono"]).toContain('"Geist Mono Variable"');
    expect(claro["--ds-radius-md"]).toBe("8px");
    expect(css).toContain("--font-sans: var(--ds-font-sans);");
  });

  for (const [modo, vars] of Object.entries(NUEVO)) {
    const c = (a: string, b: string) => contraste(valor(vars, a), valor(vars, b));

    it(`${modo}: el texto llega a 4,5:1 sobre surface, bg y fill`, () => {
      for (const t of ["--ds-fg", "--ds-fg-muted", "--ds-fg-subtle"])
        for (const fondo of ["--ds-surface", "--ds-bg", "--ds-fill"])
          expect(c(t, fondo), `${t} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5);
    });

    it(`${modo}: acento, tinta, estados y botón destructivo llegan a 4,5:1`, () => {
      expect(c("--ds-accent-fg", "--ds-accent")).toBeGreaterThanOrEqual(4.5);
      expect(c("--ds-accent", "--ds-accent-muted")).toBeGreaterThanOrEqual(4.5);
      for (const fondo of ["--ds-bg", "--ds-fill"])
        expect(c("--ds-accent", fondo), `acento sobre ${fondo}`).toBeGreaterThanOrEqual(4.5);
      expect(c("--ds-bg", "--ds-fg"), "botón de tinta").toBeGreaterThanOrEqual(4.5);
      expect(c("--ds-inverse-fg", "--ds-inverse-bg")).toBeGreaterThanOrEqual(4.5);
      expect(c("--ds-destructive-fg", "--ds-destructive-bg")).toBeGreaterThanOrEqual(4.5);
      for (const e of ["success", "warning", "danger"])
        expect(c(`--ds-${e}-fg`, `--ds-${e}-muted`), e).toBeGreaterThanOrEqual(4.5);
    });

    it(`${modo}: el borde de los controles llega a 3:1`, () => {
      expect(c("--ds-border-control", "--ds-surface")).toBeGreaterThanOrEqual(3);
      expect(c("--ds-border-control", "--ds-bg")).toBeGreaterThanOrEqual(3);
    });
  }
});

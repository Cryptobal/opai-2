import { describe, expect, it } from "vitest";

import { contraste, oscuroForzado, oscuroSistema, raiz, valor } from "./tokens-medir";

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

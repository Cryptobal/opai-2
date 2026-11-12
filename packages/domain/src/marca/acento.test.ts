import { describe, expect, it } from "vitest";

import { acentoDeMarca, contraste, FONDOS_ACENTO } from "./acento";

// Color de la empresa como acento del diseño nuevo (ADR-109, CAR-335 D1). Cada empresa pone el suyo en
// su perfil de marca; OPAI lo ajusta para que se lea bien de día y de noche (WCAG 1.4.3, 4,5:1).
// Los colores de prueba son datos de ejemplo, como los que guarda `core.marca.update`.
const MUESTRAS = [
  "#0062d1",
  "#ffd400",
  "#ffffff",
  "#000000",
  "#00ff00",
  "#a3195b",
  "#7f7f7f",
  "#1e3a8a",
  "#ff6a00",
];

describe("acentoDeMarca", () => {
  it("devuelve null si la empresa no tiene color o el valor no es un hexadecimal de 6 dígitos", () => {
    for (const malo of [null, undefined, "", "azul", "#fff", "#12345g", "0062d1x"])
      expect(acentoDeMarca(malo)).toBeNull();
  });

  it.each(MUESTRAS)(
    "%s: de día y de noche el acento se lee como texto y como botón (4,5:1)",
    (color) => {
      const a = acentoDeMarca(color);
      expect(a).not.toBeNull();
      for (const modo of ["dia", "noche"] as const) {
        const t = a![modo];
        for (const fondo of FONDOS_ACENTO[modo])
          expect(contraste(t.acento, fondo)).toBeGreaterThanOrEqual(4.5);
        expect(contraste(t.acento, t.texto)).toBeGreaterThanOrEqual(4.5);
        expect(contraste(t.suave, FONDOS_ACENTO[modo][0] ?? "")).toBeLessThan(1.3);
        expect(t.acento).toMatch(/^#[0-9a-f]{6}$/);
      }
    },
  );

  it("no toca un color que ya cumple: el azul de ejemplo queda igual de día", () => {
    expect(acentoDeMarca("#0062D1")!.dia.acento).toBe("#0062d1");
  });

  it("aclara de noche y oscurece de día un color que no cumple, conservando el matiz", () => {
    const amarillo = acentoDeMarca("#ffd400")!;
    expect(contraste(amarillo.dia.acento, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(amarillo.dia.acento).not.toBe("#ffd400");
    const marino = acentoDeMarca("#1e3a8a")!;
    expect(marino.dia.acento).toBe("#1e3a8a");
    expect(marino.noche.acento).not.toBe("#1e3a8a");
  });

  it("de día el texto sobre el acento es blanco; de noche, negro", () => {
    const a = acentoDeMarca("#0062d1")!;
    expect(a.dia.texto).toBe("#ffffff");
    expect(a.noche.texto).toBe("#000000");
  });
});

describe("FONDOS_ACENTO sigue a tokens.css", () => {
  // El ajuste del color de la empresa se calcula sobre los fondos de la piel nueva: si cambian en
  // tokens.css, esta prueba obliga a cambiarlos aquí también.
  it("fondo, menú lateral (surface) y relleno de día y de noche", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(new URL("../../../ds/src/tokens.css", import.meta.url), "utf8");
    const leer = (selector: string): Record<string, string> => {
      const abre = css.indexOf("{", css.indexOf(selector));
      const vars: Record<string, string> = {};
      for (const m of css
        .slice(abre + 1, css.indexOf("}", abre))
        .matchAll(/(--ds-[\w-]+):\s*([^;]+);/g))
        vars[m[1]!] = m[2]!.trim();
      return vars;
    };
    const dia = leer('[data-marco="nuevo"] {');
    const noche = leer(':root[data-theme="dark"] [data-marco="nuevo"] {');
    expect(FONDOS_ACENTO.dia).toEqual([dia["--ds-bg"], expect.any(String), dia["--ds-fill"]]);
    expect(FONDOS_ACENTO.noche).toEqual([
      noche["--ds-bg"],
      noche["--ds-surface"],
      noche["--ds-fill"],
    ]);
  });
});

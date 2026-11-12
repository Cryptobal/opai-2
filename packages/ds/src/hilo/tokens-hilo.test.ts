/// <reference types="node" />
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { COLORES_HILO, RADIOS_HILO, SOMBRA_HILO } from "./tokens-hilo";

// La piel Hilo de `tokens.css` es la de Claude Design (ADR-105, CAR-334). Dentro del marco Hilo, cada
// variable vale lo del bloque `[data-marco="hilo"]` o, si no la redefine, lo de `:root` (y lo mismo en
// oscuro). Este test resuelve ese valor efectivo y lo compara con `tokens-hilo.ts`.
const css = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");

function bloque(inicio: string): Record<string, string> {
  const desde = css.indexOf(inicio);
  if (desde < 0) throw new Error(`Falta el bloque ${inicio}`);
  const abre = css.indexOf("{", desde + inicio.length - 1);
  const cuerpo = css.slice(abre + 1, css.indexOf("}", abre));
  const vars: Record<string, string> = {};
  for (const m of cuerpo.matchAll(/(--ds-[\w-]+):\s*([^;]+);/g)) {
    vars[m[1]!] = m[2]!.replace(/\/\*.*?\*\//g, "").trim();
  }
  return vars;
}

const raiz = bloque(":root {");
const raizOscura = bloque(':root[data-theme="dark"] {');
const hiloClaro = { ...bloque('[data-marco="hilo"] {') };
const hiloOscuro = bloque(':root[data-theme="dark"][data-marco="hilo"],');

const efectivo = (capas: Record<string, string>[], variable: string) => {
  for (const capa of capas) if (capa[variable]) return capa[variable]!.toLowerCase();
  throw new Error(`Nadie define ${variable}`);
};

describe("piel Hilo = sistema Hilo de Claude Design", () => {
  for (const [nombre, { variable, claro, oscuro }] of Object.entries(COLORES_HILO)) {
    it(`${nombre} (${variable}) en claro y oscuro`, () => {
      expect(efectivo([hiloClaro, raiz], variable)).toBe(claro);
      expect(efectivo([hiloOscuro, raizOscura, raiz], variable)).toBe(oscuro);
    });
  }

  it("los controles tienen el radio de Hilo", () => {
    const bloques = css.split('[data-marco="hilo"] {').slice(1);
    const radio = bloques.map((b) => /--ds-radius-md:\s*(\d+)px/.exec(b)?.[1]).find(Boolean);
    expect(Number(radio)).toBe(RADIOS_HILO.md);
  });

  it("la sombra de lo que flota es la de Hilo", () => {
    expect(hiloClaro["--ds-shadow-overlay"]).toBe(SOMBRA_HILO.claro);
    expect(hiloOscuro["--ds-shadow-overlay"]).toBe(SOMBRA_HILO.oscuro);
  });
});

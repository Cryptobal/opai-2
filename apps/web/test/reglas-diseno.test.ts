/// <reference types="node" />
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { type Conteo, contarTodo, REGLAS } from "./reglas-diseno/reglas";

// Trinquete de las reglas Hilo (DISENO-hilo.md, ADR-105, CAR-334). `base.json` guarda lo que ya existía
// al fijar la regla: ningún archivo puede sumar hallazgos ni aparecer uno nuevo. Bajar está bien y no
// obliga a nada; para reflejarlo, `ACTUALIZAR_REGLAS_DISENO=1 pnpm --filter @opai/web exec vitest run
// test/reglas-diseno.test.ts` reescribe la base (solo se acepta en un PR que baja hallazgos).
const BASE = join(import.meta.dirname, "reglas-diseno/base.json");
const actual = contarTodo();

if (process.env["ACTUALIZAR_REGLAS_DISENO"] === "1") {
  writeFileSync(BASE, `${JSON.stringify(actual, null, 2)}\n`);
}

const base: Conteo = existsSync(BASE) ? (JSON.parse(readFileSync(BASE, "utf8")) as Conteo) : {};

describe("reglas de diseño Hilo (trinquete)", () => {
  for (const regla of REGLAS) {
    it(`${regla.id}: ${regla.descripcion}`, () => {
      const permitido = base[regla.id] ?? {};
      const excesos = Object.entries(actual[regla.id] ?? {})
        .filter(([archivo, n]) => n > (permitido[archivo] ?? 0))
        .map(([archivo, n]) => `${archivo}: ${n} (base ${permitido[archivo] ?? 0})`);
      expect(excesos, `Nuevos hallazgos de ${regla.id}`).toEqual([]);
    });
  }
});

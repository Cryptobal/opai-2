import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/** Pantallas de lista que deben paginar con `siguiente` (CAR-624). */
const PANTALLAS = [
  "app/(erp)/instalaciones/_componentes/datos.ts",
  "app/(erp)/tickets/_componentes/datos.ts",
  "app/_components/rendiciones/datos.ts",
  "app/_components/rendiciones/bandeja/datos.ts",
] as const;

const raiz = path.resolve(import.meta.dirname, "..");

describe("listas de pantalla con cursor (CAR-624)", () => {
  it.each(PANTALLAS)("%s usa limite y expone siguiente en la consulta", (rel) => {
    const texto = readFileSync(path.join(raiz, rel), "utf8");
    expect(texto).toMatch(/limite:\s*POR_PAGINA/);
    expect(texto).toMatch(/cursor/);
    expect(texto).toMatch(/siguiente/);
  });
});
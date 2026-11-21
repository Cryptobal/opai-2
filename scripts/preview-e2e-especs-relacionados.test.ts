import { describe, expect, it } from "vitest";

import {
  especRelacionadoConArchivo,
  especsRelacionados,
} from "./preview-e2e-especs-relacionados";

const todos = [
  "finanzas-bancos-reglas-preview.spec.ts",
  "menu-lateral-preview.spec.ts",
  "cuentas-preview.spec.ts",
];

describe("preview-e2e-especs-relacionados", () => {
  it("enlaza el spec tocado directamente", () => {
    expect(
      especRelacionadoConArchivo(
        "apps/web/e2e/menu-lateral-preview.spec.ts",
        todos,
      ),
    ).toEqual(["menu-lateral-preview.spec.ts"]);
  });

  it("enlaza por ruta de app", () => {
    const specs = especRelacionadoConArchivo(
      "apps/web/app/(erp)/finanzas/bancos/reglas/page.tsx",
      todos,
    );
    expect(specs).toContain("finanzas-bancos-reglas-preview.spec.ts");
  });

  it("agrega varios archivos del diff", () => {
    const set = especsRelacionados([
      "apps/web/e2e/cuentas-preview.spec.ts",
      "packages/ds/src/shell/menu-lateral.tsx",
    ]);
    expect(set.has("cuentas-preview.spec.ts")).toBe(true);
    expect(set.has("menu-lateral-preview.spec.ts")).toBe(true);
  });
});
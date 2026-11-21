import { describe, expect, it } from "vitest";

import {
  especRelacionadoConArchivo,
  especsRelacionados,
  specSiempreBloquea,
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

  it("marca portal, acceso, login y ver-como como siempre bloqueantes", () => {
    expect(specSiempreBloquea("portal-cliente-preview.spec.ts")).toBe(true);
    expect(specSiempreBloquea("acceso-preview.spec.ts")).toBe(true);
    expect(specSiempreBloquea("login-preview.spec.ts")).toBe(true);
    expect(specSiempreBloquea("ver-como-supervisor-preview.spec.ts")).toBe(true);
    expect(specSiempreBloquea("cuentas-preview.spec.ts")).toBe(false);
  });

  it("incluye siempre bloqueantes aunque el diff no los toque", () => {
    const set = especsRelacionados(["apps/web/e2e/cuentas-preview.spec.ts"]);
    expect(set.has("login-preview.spec.ts") || [...set].some((s) => s.includes("login"))).toBe(true);
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
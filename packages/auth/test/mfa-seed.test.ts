import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("preparación MFA de los e2e de CI", () => {
  it("el seed común a e2e y rendimiento prepara el segundo factor sin depender de multiempresa", () => {
    const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), "utf8");
    const db = JSON.parse(leer("../../db/package.json")) as { scripts: Record<string, string> };
    expect(db.scripts["seed:e2e"]).toContain("pnpm --filter @opai/auth seed:e2e-mfa");
    const workflow = leer("../../../.github/workflows/ci.yml");
    const rendimiento = workflow.slice(workflow.indexOf("  rendimiento:"));
    expect(rendimiento).toContain("pnpm --filter @opai/db seed:e2e");
    expect(rendimiento).not.toContain("seed:multiempresa-e2e");
  });
});

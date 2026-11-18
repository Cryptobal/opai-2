import { describe, expect, it } from "vitest";

import {
  SLUG_EMPRESA_QA_E2E,
  esSlugEmpresaQa,
  exigirRamaPreview,
  exigirTenantQaE2e,
  slugsEmpresasAjenasEnPreview,
} from "./preview-qa";

describe("preview · empresas y rama Neon", () => {
  it("acepta slugs qa-* y rechaza Gard u otros", () => {
    expect(esSlugEmpresaQa("qa-e2e")).toBe(true);
    expect(esSlugEmpresaQa("qa-finanzas-a")).toBe(true);
    expect(esSlugEmpresaQa("gard")).toBe(false);
    expect(slugsEmpresasAjenasEnPreview(["qa-e2e", "gard", "dev"])).toEqual(["gard", "dev"]);
  });
  it("exige rama preview/pr-N", () => {
    expect(() => exigirRamaPreview("preview/pr-12")).not.toThrow();
    expect(() => exigirRamaPreview("main")).toThrow(/preview\/pr-N/);
    expect(() => exigirRamaPreview("respaldo-2026")).toThrow();
  });
  it("las siembras de preview solo admiten qa-e2e", () => {
    expect(() => exigirTenantQaE2e(SLUG_EMPRESA_QA_E2E)).not.toThrow();
    expect(() => exigirTenantQaE2e("gard")).toThrow(/qa-e2e/);
  });
});
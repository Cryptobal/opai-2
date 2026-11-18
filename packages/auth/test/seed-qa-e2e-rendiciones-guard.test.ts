import { describe, expect, it } from "vitest";

import { exigirRamaPreview, exigirTenantQaE2e } from "@opai/domain";

describe("seed qa-e2e-rendiciones · guardas", () => {
  it("rechaza tenant distinto de qa-e2e", () => {
    expect(() => exigirTenantQaE2e("qa-e2e")).not.toThrow();
    expect(() => exigirTenantQaE2e("gard")).toThrow(/qa-e2e/);
    expect(() => exigirTenantQaE2e("qa-otra")).toThrow();
  });
  it("rechaza correr sin rama preview/pr-N", () => {
    expect(() => exigirRamaPreview("preview/pr-42")).not.toThrow();
    expect(() => exigirRamaPreview("main")).toThrow();
  });
});
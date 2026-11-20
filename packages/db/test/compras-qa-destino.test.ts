import { describe, expect, it } from "vitest";

import { exigirDestinoComprasQaLocal } from "../scripts/compras-qa-destino";

describe("destino de fixture local compras", () => {
  it("permite solo PostgreSQL efímero local explícito", () => {
    expect(() =>
      exigirDestinoComprasQaLocal("postgresql://127.0.0.1:55483/opai_e2e_compras"),
    ).not.toThrow();
  });
  it.each([
    "postgresql://example.invalid/opai_e2e_compras",
    "postgresql://localhost/opai_e2e_compras",
    "postgresql://127.0.0.1/main",
    "postgresql://127.0.0.1/dev",
    "postgresql://127.0.0.1/opai_e2e_compras?host=example.invalid",
    "postgresql://127.0.0.1/opai_e2e_compras#fragmento",
    "https://127.0.0.1/opai_e2e_compras",
  ])("rechaza destino ambiguo o remoto: %s", (url) => {
    expect(() => exigirDestinoComprasQaLocal(url)).toThrow();
  });
});

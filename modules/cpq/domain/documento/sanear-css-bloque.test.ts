import { describe, expect, it } from "vitest";

import { sanearCssBloque } from "./sanear-css-bloque";

describe("sanearCssBloque", () => {
  it("conserva reglas simples y variables --marca-*", () => {
    const r = sanearCssBloque(".a{color:#111;padding:8px 12px}:root{--marca-prim:#0a3d62}");
    expect(r.errores).toEqual([]);
    expect(r.css).toContain(".a{");
    expect(r.css).toContain("--marca-prim");
  });

  it.each([
    "@import url(https://x.cl/a.css)",
    "body{background:url(https://x.cl/a.png)}",
    ".x{width:expression(alert(1))}",
  ])("rechaza %s", (css) => {
    expect(sanearCssBloque(css).errores.length).toBeGreaterThan(0);
  });
});
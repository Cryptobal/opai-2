import { describe, expect, it } from "vitest";

import { esPrecargaVueltaApp } from "@/lib/canje-app";

describe("esPrecargaVueltaApp", () => {
  it("detecta next-router-prefetch", () => {
    expect(esPrecargaVueltaApp(new Headers({ "next-router-prefetch": "1" }))).toBe(true);
    expect(esPrecargaVueltaApp(new Headers())).toBe(false);
  });

  it("detecta purpose y sec-purpose", () => {
    expect(esPrecargaVueltaApp(new Headers({ purpose: "prefetch" }))).toBe(true);
    expect(esPrecargaVueltaApp(new Headers({ "sec-purpose": "prefetch;prerender" }))).toBe(true);
    expect(esPrecargaVueltaApp(new Headers({ purpose: "document" }))).toBe(false);
  });
});
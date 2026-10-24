import { describe, expect, it } from "vitest";

import { nombreDePila } from "../lib/nombre";

describe("nombreDePila", () => {
  it("toma el primer nombre", () => {
    expect(nombreDePila("Ana María Soto")).toBe("Ana");
  });
  it("no muestra el correo completo", () => {
    expect(nombreDePila("carlos.irigoyen@gmail.com")).toBe("Carlos");
    expect(nombreDePila("OPS_gard@x.cl")).toBe("Ops");
  });
});

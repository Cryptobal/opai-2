import { describe, expect, it } from "vitest";

import { huellaDocumento } from "./huella";

const K = "clave-de-prueba-que-nunca-es-la-real-0123456789";
const A = "01a1b67d-a990-7385-89f6-6eda2de40ef2";
const B = "01a1b67d-a990-7385-89f6-6eda2de40ef3";
const e = { tenantId: A, tipo: "run" as const, clave: "12345678-5" };

describe("huellaDocumento", () => {
  it("es determinista y no contiene el documento", () => {
    expect(huellaDocumento(e, K)).toBe(huellaDocumento({ ...e }, K));
    expect(huellaDocumento(e, K)).toMatch(/^[0-9a-f]{64}$/);
    expect(huellaDocumento(e, K)).not.toContain("12345678");
  });
  it("separa por empresa, por tipo de documento y por clave", () => {
    const base = huellaDocumento(e, K);
    expect(huellaDocumento({ ...e, tenantId: B }, K)).not.toBe(base);
    expect(huellaDocumento({ ...e, tipo: "otro" }, K)).not.toBe(base);
    expect(huellaDocumento({ ...e, clave: "12345679-3" }, K)).not.toBe(base);
  });
  it("otra clave produce otra huella (rotación)", () => {
    expect(huellaDocumento(e, `${K}x`)).not.toBe(huellaDocumento(e, K));
  });
  it("el separador evita colisiones por concatenación", () => {
    const x = huellaDocumento({ tenantId: A, tipo: "patente", clave: "AB" }, K);
    const y = huellaDocumento({ tenantId: A, tipo: "patente", clave: "A\u0000B" }, K);
    expect(x).not.toBe(y);
  });
  it("sin empresa o sin clave falla", () => {
    expect(() => huellaDocumento({ ...e, tenantId: "" }, K)).toThrow();
    expect(() => huellaDocumento({ ...e, clave: "" }, K)).toThrow();
  });
});

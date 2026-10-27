import { describe, expect, it } from "vitest";

import { cabecerasSeguridad } from "@/lib/cabeceras-seguridad";

const mapa = (cs: { key: string; value: string }[]) =>
  Object.fromEntries(cs.map((c) => [c.key, c.value]));

describe("cabecerasSeguridad", () => {
  it("siempre lleva las cabeceras base y la Permissions-Policy mínima", () => {
    for (const opciones of [{ produccion: true }, { produccion: false }]) {
      const h = mapa(cabecerasSeguridad(opciones));
      expect(h["X-Frame-Options"]).toBe("DENY");
      expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["X-Content-Type-Options"]).toBe("nosniff");
      expect(h["Permissions-Policy"]).toBe("camera=(self), geolocation=(self), microphone=()");
    }
  });

  it("solo manda HSTS en producción, con dos años, includeSubDomains y sin preload", () => {
    const prod = mapa(cabecerasSeguridad({ produccion: true }));
    expect(prod["Strict-Transport-Security"]).toBe("max-age=63072000; includeSubDomains");
    expect(prod["Strict-Transport-Security"]).not.toContain("preload");
    const dev = mapa(cabecerasSeguridad({ produccion: false }));
    expect(dev["Strict-Transport-Security"]).toBeUndefined();
  });
});

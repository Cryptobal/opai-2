import { describe, expect, it } from "vitest";

import { cabecerasSeguridad, construirCsp } from "@/lib/cabeceras-seguridad";

const mapa = (cs: { key: string; value: string }[]) =>
  Object.fromEntries(cs.map((c) => [c.key, c.value]));

describe("cabecerasSeguridad", () => {
  it("siempre lleva las cabeceras base, la Permissions-Policy mínima y la CSP en enforcement", () => {
    for (const opciones of [
      { produccion: true, desarrollo: false },
      { produccion: false, desarrollo: true },
    ]) {
      const h = mapa(cabecerasSeguridad(opciones));
      expect(h["X-Frame-Options"]).toBe("DENY");
      expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["X-Content-Type-Options"]).toBe("nosniff");
      expect(h["Permissions-Policy"]).toBe("camera=(self), geolocation=(self), microphone=()");
      // La CSP bloquea (CAR-57): ya no viaja en Report-Only, y sigue reportando.
      expect(h["Content-Security-Policy"]).toBeTruthy();
      expect(h["Content-Security-Policy-Report-Only"]).toBeUndefined();
      expect(h["Reporting-Endpoints"]).toBe('csp="/api/csp-report"');
      expect(h["Content-Security-Policy"]).toContain(
        "report-uri /api/csp-report; report-to csp",
      );
    }
  });

  it("solo manda HSTS en producción, con dos años y sin extenderlo a subdominios no verificados", () => {
    const prod = mapa(cabecerasSeguridad({ produccion: true, desarrollo: false }));
    expect(prod["Strict-Transport-Security"]).toBe("max-age=63072000");
    expect(prod["Strict-Transport-Security"]).not.toContain("includeSubDomains");
    expect(prod["Strict-Transport-Security"]).not.toContain("preload");
    const dev = mapa(cabecerasSeguridad({ produccion: false, desarrollo: true }));
    expect(dev["Strict-Transport-Security"]).toBeUndefined();
  });

  it("la CSP fija el origen propio y cierra marcos, objetos y base-uri", () => {
    const csp = construirCsp(false);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it("img-src, connect-src y frame-src admiten R2 (subida, descarga y vista previa)", () => {
    const csp = construirCsp(false);
    const r2 = "https://*.r2.cloudflarestorage.com";
    expect(csp).toContain(`img-src 'self' data: blob: ${r2}`);
    expect(csp).toContain(`connect-src 'self' ${r2}`);
    expect(csp).toContain(`frame-src 'self' blob: ${r2}`);
  });

  it("'unsafe-eval' solo en desarrollo (refresco de Next); nunca en producción", () => {
    expect(construirCsp(true)).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(construirCsp(false)).toContain("script-src 'self' 'unsafe-inline'");
    expect(construirCsp(false)).not.toContain("'unsafe-eval'");
  });
});

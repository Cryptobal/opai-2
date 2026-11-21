import { describe, expect, it } from "vitest";

import { urlContingenciaEnlace, urlPortalMarcar, RUTAS_CORREO_ASISTENCIA } from "../capabilities/urls-correo";

describe("URLs de correos de asistencia", () => {
  it("las rutas de portal y enlace no usan rutas inexistentes", () => {
    const base = "https://test.opai.cl";
    const ejemplos = [
      urlPortalMarcar(base),
      urlContingenciaEnlace(base, "qa-e2e", "token-ejemplo-12345678901234567890"),
      `${base}/correccion/qa-e2e/token`,
      `${base}/verificar/marca/qa-e2e/hash`,
      `${base}/personas/00000000-0000-4000-8000-000000000001`,
    ];
    for (const url of ejemplos) {
      const ruta = new URL(url).pathname;
      expect(RUTAS_CORREO_ASISTENCIA.some((p) => ruta.startsWith(p) || ruta === p.replace(/\/$/, ""))).toBe(true);
    }
    expect(ejemplos.some((u) => u.includes("/mis-marcas"))).toBe(false);
  });
});
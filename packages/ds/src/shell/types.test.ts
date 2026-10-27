import { describe, expect, it } from "vitest";

import { esActivo } from "./types";

describe("esActivo", () => {
  it("con activoEn marca el ítem bajo un prefijo extra sin que su href sea el enlace", () => {
    // «Empresas» (`exacta`) cubre el índice y el detalle de un tenant, no las demás secciones (H5).
    expect(esActivo("/platform", "/platform", true, "/platform/tenants")).toBe(true);
    expect(esActivo("/platform/tenants/abc", "/platform", true, "/platform/tenants")).toBe(true);
    expect(esActivo("/platform/trabajos", "/platform", true, "/platform/tenants")).toBe(false);
    // «Hoy» (`exacta` en /supervisor) cubre la ficha de persona, no las instalaciones (H6).
    expect(esActivo("/supervisor/personas/1", "/supervisor", true, "/supervisor/personas")).toBe(
      true,
    );
    expect(esActivo("/supervisor/instalaciones", "/supervisor", true, "/supervisor/personas")).toBe(
      false,
    );
  });

  it("sin activoEn respeta exacta y la raíz", () => {
    expect(esActivo("/supervisor/instalaciones", "/supervisor", true)).toBe(false);
    expect(esActivo("/cuentas/1", "/cuentas")).toBe(true);
    expect(esActivo("/cuentas", "/")).toBe(false);
    expect(esActivo("/", "/")).toBe(true);
  });
});

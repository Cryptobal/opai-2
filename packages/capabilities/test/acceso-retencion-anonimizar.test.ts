import { describe, expect, it, vi } from "vitest";

import { trabajoRetencionAcceso } from "../src/acceso/retencion-trabajo";

describe("trabajo acceso.retencion.anonimizar", () => {
  it("no corre si el módulo acceso está inactivo", async () => {
    const ctx = {
      modulosActivos: [] as string[],
      transaccion: vi.fn(),
    };
    const r = await trabajoRetencionAcceso.ejecutar(ctx as never, { dia: "2026-11-17" });
    expect(r).toEqual({ registros: 0, intentos: 0 });
    expect(ctx.transaccion).not.toHaveBeenCalled();
  });
});
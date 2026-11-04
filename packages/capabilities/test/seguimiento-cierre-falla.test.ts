// CAR-162: si cerrar el negocio sin respuesta falla, no se traga el error: se cuenta y se registra.
import { afterEach, describe, expect, it, vi } from "vitest";

import { contextoDePrueba } from "../src/testing";

vi.mock("../src/comercial/seguimiento-cierre", () => ({
  cerrarSinRespuesta: vi.fn(async () => {
    throw new Error("detalle con datos de Juan Pérez, RUT 11.111.111-1");
  }),
}));
vi.mock("../src/comercial/seguimiento-comun", () => ({
  configDeVersion: vi.fn(async () => ({ pasos: [], alTerminar: "aplicar_cierre_propuesto" })),
}));

import { trabajoVencerPasosSeguimiento } from "../src/comercial/seguimiento-trabajo";

afterEach(() => vi.restoreAllMocks());

describe("trabajo de seguimiento · cierre sin respuesta", () => {
  it("cuenta el cierre fallido y registra solo categorías, sin PII", async () => {
    const { ctx } = contextoDePrueba({ modulosActivos: ["comercial"] });
    const s = await ctx.db.seguimiento.create({
      data: { tenantId: ctx.tenantId, negocioId: "n1", planId: "p1", planVersion: 1, estado: "activo" },
    });
    await ctx.db.seguimientoPaso.create({
      data: { tenantId: ctx.tenantId, seguimientoId: s.id, orden: 1, estado: "hecho", ejecutor: "vendedor", canal: "llamada", programadoEn: new Date(0) },
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await trabajoVencerPasosSeguimiento.ejecutar(ctx, { hora: "10" });
    expect(r).toMatchObject({ terminados: 1, cerrados: 0, cierresFallidos: 1 });
    expect(log).toHaveBeenCalledOnce();
    const volcado = JSON.stringify(log.mock.calls);
    expect(volcado).toContain("comercial.seguimiento.cierre_fallido");
    expect(volcado).not.toMatch(/Juan|RUT|11\.111/);
  });
});

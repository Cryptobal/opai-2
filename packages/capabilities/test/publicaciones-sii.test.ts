import { describe, expect, it } from "vitest";

import { publicacionesParaFecha } from "../src/core/remuneraciones/publicaciones";
import { contextoDePrueba } from "../src/testing";

describe("publicaciones UF/UTM solo plataforma", () => {
  it("ignora valores tenant de uf y usa plataforma", async () => {
    const { ctx, tabla } = contextoDePrueba();
    const ufId = "00000000-0000-4000-8000-000000000001";
    tabla("indicadorLegal").push({ id: ufId, clave: "uf" });
    tabla("valorTenant").push({
      id: "t1",
      tenantId: ctx.tenantId,
      indicadorId: ufId,
      valorJson: 1,
      vigenteDesde: new Date("2026-11-01"),
      vigenteHasta: null,
      estado: "vigente",
    });
    tabla("valorPublicado").push({
      id: "p1",
      indicadorId: ufId,
      valorJson: 4_125_826,
      vigenteDesde: new Date("2026-11-02"),
      vigenteHasta: null,
      estado: "vigente",
      fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
    });
    const pubs = await publicacionesParaFecha(ctx, "2026-11-02");
    expect(pubs.find((p) => p.indicador === "uf")?.valor).toBe(4_125_826);
  });
});

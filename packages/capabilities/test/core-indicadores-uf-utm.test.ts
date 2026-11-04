import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

const f = (s: string) => new Date(`${s}T00:00:00.000Z`);
const semilla = {
  indicadorLegal: [
    { id: "i-uf", clave: "uf" },
    { id: "i-utm", clave: "utm" },
  ],
  valorPublicado: [
    { id: "v1", indicadorId: "i-uf", estado: "vigente", vigenteDesde: f("2026-11-03"), valorJson: 3_912_345 },
    { id: "v2", indicadorId: "i-uf", estado: "vigente", vigenteDesde: f("2026-11-04"), valorJson: 3_913_000 },
    { id: "v3", indicadorId: "i-uf", estado: "propuesto", vigenteDesde: f("2026-11-05"), valorJson: 1 },
    { id: "v4", indicadorId: "i-utm", estado: "vigente", vigenteDesde: f("2026-11-01"), valorJson: 69_000 },
  ],
};

describe("core.indicadores.uf_utm", () => {
  it("devuelve la UF del día exacto y la UTM del mes", async () => {
    const { ctx } = contextoDePrueba({ semilla });
    expect(await dato(ctx, "core.indicadores.uf_utm", { fecha: "2026-11-04" })).toEqual({
      fecha: "2026-11-04",
      uf: { fecha: "2026-11-04", exacta: true, centavosClp: 3_913_000 },
      utm: { fecha: "2026-11-01", exacta: true, clp: 69_000 },
    });
  });

  it("si falta el día, devuelve la última anterior marcada como no exacta; ignora lo no vigente", async () => {
    const { ctx } = contextoDePrueba({ semilla });
    const r = await dato<{ uf: { fecha: string; exacta: boolean; centavosClp: number } }>(ctx, "core.indicadores.uf_utm", {
      fecha: "2026-11-09",
    });
    expect(r.uf).toEqual({ fecha: "2026-11-04", exacta: false, centavosClp: 3_913_000 });
  });

  it("sin publicaciones devuelve null, no un valor inventado", async () => {
    const { ctx } = contextoDePrueba({ semilla: { indicadorLegal: [], valorPublicado: [] } });
    expect(await dato(ctx, "core.indicadores.uf_utm", { fecha: "2026-11-04" })).toEqual({
      fecha: "2026-11-04",
      uf: null,
      utm: null,
    });
  });
});

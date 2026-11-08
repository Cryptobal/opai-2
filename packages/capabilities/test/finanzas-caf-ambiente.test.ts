import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exigirCafDelAmbiente, mensajeCafAmbiente } from "../src/finanzas/caf-ambiente";
import { foliosPrevistos } from "../src/finanzas/ventas-folios-logica";
import type { Contexto } from "../src/types";

const rango = (idk: string | null, cafAmbiente: string | null = null) => ({
  folioDesde: 2064,
  folioHasta: 2068,
  folioActual: 2064,
  cafVenceEn: null,
  cafIdk: idk,
  cafAmbiente,
});
const cfgCert = { ambiente: "certificacion", emisionProveedor: "simpleapi" };

describe("ambiente del CAF vs ambiente de emisión (CAR-196)", () => {
  beforeEach(() => vi.stubEnv("OPAI_PRODUCCION_TRIBUTARIA", ""));
  afterEach(() => vi.unstubAllEnvs());

  it("un CAF de producción (IDK 300) no sirve para emitir en certificación", () => {
    expect(() => exigirCafDelAmbiente(cfgCert, rango("300"))).toThrow(/otro ambiente/);
  });
  it("un CAF de certificación (IDK 100) sirve en certificación", () => {
    expect(() => exigirCafDelAmbiente(cfgCert, rango("100"))).not.toThrow();
  });
  it("el candado CAR-191 manda: configurado «producción» fuera de app.opai.cl emite en certificación", () => {
    const cfg = { ambiente: "produccion", emisionProveedor: "simpleapi" };
    expect(() => exigirCafDelAmbiente(cfg, rango("300"))).toThrow(/otro ambiente/);
    expect(() => exigirCafDelAmbiente(cfg, rango("100"))).not.toThrow();
  });
  it("con producción habilitada en app.opai.cl solo sirve el CAF de producción", () => {
    vi.stubEnv("OPAI_PRODUCCION_TRIBUTARIA", "habilitada");
    vi.stubEnv("BETTER_AUTH_URL", "https://app.opai.cl");
    const cfg = { ambiente: "produccion", emisionProveedor: "simpleapi" };
    expect(() => exigirCafDelAmbiente(cfg, rango("300"))).not.toThrow();
    expect(() => exigirCafDelAmbiente(cfg, rango("100"))).toThrow(/otro ambiente/);
  });
  it("IDK desconocido y sin marca: no se usa", () => {
    expect(() => exigirCafDelAmbiente(cfgCert, rango("999"))).toThrow(/No se pudo determinar/);
    expect(mensajeCafAmbiente(rango(null), "certificacion")).toMatch(/No se pudo determinar/);
  });
  it("la marca guardada prevalece sobre el IDK", () => {
    expect(() => exigirCafDelAmbiente(cfgCert, rango("300", "certificacion"))).not.toThrow();
  });
  it("emisión simulada: no aplica", () => {
    expect(() => exigirCafDelAmbiente({ ambiente: "certificacion", emisionProveedor: "simulado" }, rango("300"))).not.toThrow();
  });

  it("foliosPrevistos no entrega folios de un CAF de otro ambiente", async () => {
    const ctx = {
      tenantId: "t",
      db: {
        dteFolio: { findMany: async () => [{ id: "a", ...rango("300") }] },
        dteConfig: { findUnique: async () => cfgCert },
      },
    } as unknown as Contexto;
    await expect(foliosPrevistos(ctx, 33, 1)).rejects.toThrow(/otro ambiente/);
  });
});

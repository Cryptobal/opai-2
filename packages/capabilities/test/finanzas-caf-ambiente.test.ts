import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exigirCafDelAmbiente, mensajeCafAmbiente } from "../src/finanzas/caf-ambiente";
import { rangosParaEmitir, seleccionarFoliosPrevistos } from "../src/finanzas/folios-previstos";

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
  it("emisión simulada: nunca usa un CAF de producción, solo de certificación (CAR-240)", () => {
    const simulado = { ambiente: "certificacion", emisionProveedor: "simulado" };
    expect(() => exigirCafDelAmbiente(simulado, rango("300"))).toThrow(/otro ambiente/);
    expect(() => exigirCafDelAmbiente(simulado, rango("100"))).not.toThrow();
    // Ni siquiera con la config en producción: el simulado no gasta folios de producción.
    expect(() => exigirCafDelAmbiente({ ...simulado, ambiente: "produccion" }, rango("300"))).toThrow(/otro ambiente/);
  });

  it("la selección de folios previstos no entrega folios de un CAF de otro ambiente", () => {
    const r = { id: "a", ...rango("300") };
    expect(() => seleccionarFoliosPrevistos([r], cfgCert, "2026-11-08", 33, 1)).toThrow(
      /No hay un CAF activo de certificación para el DTE 33/,
    );
    expect(seleccionarFoliosPrevistos([{ ...r, cafIdk: "100" }], cfgCert, "2026-11-08", 33, 2)).toEqual([2064, 2065]);
    expect(() => seleccionarFoliosPrevistos([{ ...r, cafIdk: "100" }], cfgCert, "2026-11-08", 33, 9)).toThrow(/No hay folios/);
  });

  it("salta el CAF de otro ambiente y usa el siguiente del ambiente correcto (CAR-240)", () => {
    const prod = { ...rango("300"), folioDesde: 100, folioHasta: 105, folioActual: 100 };
    const cert = { ...rango("100"), folioDesde: 2064, folioHasta: 2068, folioActual: 2066 };
    expect(rangosParaEmitir([prod, cert], cfgCert, "2026-11-08", 33)).toEqual([cert]);
    expect(seleccionarFoliosPrevistos([prod, cert], cfgCert, "2026-11-08", 33, 2)).toEqual([2066, 2067]);
    const simulado = { ambiente: "certificacion", emisionProveedor: "simulado" };
    expect(seleccionarFoliosPrevistos([prod, cert], simulado, "2026-11-08", 33, 1)).toEqual([2066]);
    expect(() => rangosParaEmitir([prod], simulado, "2026-11-08", 33)).toThrow(
      /La emisión simulada solo usa CAF de certificación/,
    );
  });
  it("los errores distinguen sin folios, vencido y otro ambiente", () => {
    expect(() => rangosParaEmitir([], cfgCert, "2026-11-08", 33)).toThrow(/No hay folios disponibles/);
    const vencido = { ...rango("100"), cafVenceEn: new Date("2026-01-01T00:00:00Z") };
    expect(() => rangosParaEmitir([vencido], cfgCert, "2026-11-08", 33)).toThrow(/vencido/);
  });
});

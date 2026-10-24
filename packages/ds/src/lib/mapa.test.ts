import { describe, expect, it } from "vitest";

import { diametroGeocercaPct, metrosPorPixel, ZOOM_MAPA, zoomParaGeocerca } from "./mapa";

const SANTIAGO = -33.36;

describe("geometría del mapa estático", () => {
  it("a la latitud de Santiago y zoom 16 un pixel son ~2 m", () => {
    expect(metrosPorPixel(SANTIAGO, 16)).toBeCloseTo(2.0, 1);
  });

  it("sin geocerca usa el zoom por defecto; con geocerca elige el mayor que la deja dentro", () => {
    expect(zoomParaGeocerca(SANTIAGO, null)).toBe(ZOOM_MAPA);
    expect(zoomParaGeocerca(SANTIAGO, 300)).toBe(16);
    expect(zoomParaGeocerca(SANTIAGO, 100)).toBe(17);
    expect(zoomParaGeocerca(SANTIAGO, 5_000)).toBeLessThan(15);
  });

  it("el círculo de la geocerca nunca se sale del mapa ni desaparece", () => {
    for (const radio of [20, 100, 300, 1_000, 20_000]) {
      const z = zoomParaGeocerca(SANTIAGO, radio);
      const pct = diametroGeocercaPct(SANTIAGO, z, radio);
      expect(pct).toBeGreaterThanOrEqual(4);
      expect(pct).toBeLessThanOrEqual(100);
    }
    // 300 m a zoom 16 son ~300 px de 640: cerca del 47 % que dibujaba el diseño.
    expect(diametroGeocercaPct(SANTIAGO, 16, 300)).toBeCloseTo(46.9, 0);
  });
});

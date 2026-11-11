import { describe, expect, it } from "vitest";

import {
  cacheSiiVigente,
  claveConsultaSii,
  esEstadoCacheSii,
  puedeRefrescarSii,
  venceCacheSii,
} from "./consulta-sii-cache";

const t0 = new Date("2026-11-10T12:00:00.000Z");

describe("caché de la consulta al SII", () => {
  it("solo guarda respuestas definitivas", () => {
    expect(esEstadoCacheSii("ok")).toBe(true);
    expect(esEstadoCacheSii("sin_inicio")).toBe(true);
    expect(esEstadoCacheSii("no_encontrado")).toBe(true);
    expect(esEstadoCacheSii("sin_respuesta")).toBe(false);
    expect(esEstadoCacheSii("no_configurado")).toBe(false);
  });

  it("los datos valen 30 días; un RUT sin registros, 1 día", () => {
    expect(venceCacheSii("ok", t0).toISOString()).toBe("2026-12-10T12:00:00.000Z");
    expect(venceCacheSii("sin_inicio", t0).toISOString()).toBe("2026-11-17T12:00:00.000Z");
    expect(venceCacheSii("no_encontrado", t0).toISOString()).toBe("2026-11-11T12:00:00.000Z");
  });

  it("vigente hasta el instante de vencimiento (exclusivo)", () => {
    const vence = venceCacheSii("no_encontrado", t0);
    expect(cacheSiiVigente(vence, new Date(vence.getTime() - 1))).toBe(true);
    expect(cacheSiiVigente(vence, vence)).toBe(false);
  });

  it("refrescar a mano exige 10 minutos desde la última consulta", () => {
    expect(puedeRefrescarSii(t0, new Date(t0.getTime() + 9 * 60_000))).toBe(false);
    expect(puedeRefrescarSii(t0, new Date(t0.getTime() + 10 * 60_000))).toBe(true);
  });

  it("la clave del trabajo es por RUT y día UTC", () => {
    expect(claveConsultaSii("76418552-8", t0)).toBe(
      "core.sii.consultar_contribuyente:76418552-8:2026-11-10",
    );
  });
});

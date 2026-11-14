import { describe, expect, it } from "vitest";

import { alertaParaAgrupar, masGrave, senalDe } from "./senales";

const ahora = new Date("2026-11-14T12:00:00Z");
const hace = (min: number) => new Date(ahora.getTime() - min * 60_000);

describe("alertaParaAgrupar", () => {
  const abiertas = [
    { id: "vieja-mismo-evento", instalacionId: "i1", personaId: "p1", origen: "rondas.ejecucion.atrasada", estado: "nueva", createdAt: hace(60) },
    { id: "reciente-otra", instalacionId: "i1", personaId: "p1", origen: "asistencia.alerta.sin_marca_inicio", estado: "escalada", createdAt: hace(5) },
    { id: "otra-persona", instalacionId: "i1", personaId: "p2", origen: "rondas.emergencia", estado: "nueva", createdAt: hace(1) },
  ];
  it("suma a la alerta reciente del mismo guardia aunque el evento sea otro", () => {
    expect(alertaParaAgrupar(abiertas, { instalacionId: "i1", personaId: "p1", evento: "rondas.punto.omitido" }, ahora)?.id).toBe("reciente-otra");
  });
  it("una sola alerta por guardia y evento, aunque sea vieja", () => {
    const sinReciente = abiertas.filter((a) => a.id !== "reciente-otra");
    expect(alertaParaAgrupar(sinReciente, { instalacionId: "i1", personaId: "p1", evento: "rondas.ejecucion.atrasada" }, ahora)?.id).toBe("vieja-mismo-evento");
  });
  it("una pospuesta del mismo guardia vuelve con cualquier señal nueva", () => {
    const pospuesta = [{ id: "pos", instalacionId: "i1", personaId: "p1", origen: "rondas.ejecucion.atrasada", estado: "pospuesta", createdAt: hace(90) }];
    expect(alertaParaAgrupar(pospuesta, { instalacionId: "i1", personaId: "p1", evento: "rondas.emergencia" }, ahora)?.id).toBe("pos");
  });
  it("no junta personas ni instalaciones distintas", () => {
    expect(alertaParaAgrupar(abiertas, { instalacionId: "i2", personaId: "p1", evento: "rondas.emergencia" }, ahora)).toBeNull();
    expect(alertaParaAgrupar(abiertas, { instalacionId: "i1", personaId: null, evento: "rondas.emergencia" }, ahora)).toBeNull();
  });
});

it("la severidad solo sube y la emergencia es fija", () => {
  expect(masGrave("media", "critica")).toBe("critica");
  expect(masGrave("alta", "baja")).toBe("alta");
  expect(senalDe("rondas.emergencia")).toMatchObject({ severidad: "critica", fija: true });
  expect(senalDe("otro.evento")).toBeNull();
});

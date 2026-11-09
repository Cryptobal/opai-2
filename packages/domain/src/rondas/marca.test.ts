import { describe, expect, it } from "vitest";

import { evaluarMarcaPunto, type EntradaMarca } from "./marca";

const base: EntradaMarca = {
  modo: "qr_gps",
  estricto: false,
  centro: { lat: -33.45, lng: -70.66 },
  radioM: 15,
  precisionMinM: 20,
  lectura: { lat: -33.45, lng: -70.66, precisionM: 5 },
  etiquetaReemplazada: false,
};

describe("evaluarMarcaPunto", () => {
  it("dentro de la geocerca: sin anomalías", () => {
    expect(evaluarMarcaPunto(base)).toEqual({ geocerca: "dentro", distanciaM: 0, anomalias: [] });
  });
  it("sin lectura GPS la marca vale: queda «sin_gps»", () => {
    expect(evaluarMarcaPunto({ ...base, lectura: null })).toEqual({
      geocerca: "sin_gps",
      distanciaM: null,
      anomalias: [],
    });
  });
  it("fuera de la geocerca solo es anomalía en modo estricto", () => {
    const lejos = { lat: -33.4505, lng: -70.66, precisionM: 5 }; // ~55 m
    expect(evaluarMarcaPunto({ ...base, lectura: lejos }).anomalias).toEqual([]);
    expect(evaluarMarcaPunto({ ...base, estricto: true, lectura: lejos }).anomalias).toEqual([
      "fuera_de_geocerca",
    ]);
  });
  it("QR leído a más de 100 m de su punto: anomalía (R8); en modo solo GPS no aplica", () => {
    const lejos = { lat: -33.452, lng: -70.66, precisionM: 5 }; // ~222 m
    expect(evaluarMarcaPunto({ ...base, lectura: lejos }).anomalias).toContain(
      "qr_lejos_de_su_punto",
    );
    expect(evaluarMarcaPunto({ ...base, modo: "gps", lectura: lejos }).anomalias).toEqual([]);
  });
  it("etiqueta reemplazada deja su anomalía aunque no haya GPS", () => {
    expect(
      evaluarMarcaPunto({ ...base, lectura: null, etiquetaReemplazada: true }).anomalias,
    ).toEqual(["etiqueta_reemplazada"]);
  });
});

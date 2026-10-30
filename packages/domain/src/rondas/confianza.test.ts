import { describe, expect, it } from "vitest";

import {
  MODELO_CONFIANZA_V1,
  bandaDe,
  desgloseConfianza,
  pesosValidos,
  puntajeRonda,
} from "./confianza";
import type { ClaveSenal, EstadoSenal } from "./tipos";

const todas = (estado: EstadoSenal): Record<ClaveSenal, EstadoSenal> => ({
  geocerca: estado,
  velocidad: estado,
  movimiento: estado,
  foto: estado,
  mismo_dispositivo: estado,
  bateria: estado,
});

describe("modelo de confianza v1 (R19, R20)", () => {
  it("los pesos de 1.0 suman 100", () => {
    expect(pesosValidos(MODELO_CONFIANZA_V1)).toBe(true);
    expect(MODELO_CONFIANZA_V1.nombre).toBe("Modelo de confianza v1");
  });

  it("todas las señales cumplen: 100, banda verde", () => {
    const d = desgloseConfianza(MODELO_CONFIANZA_V1, todas("cumple"));
    expect(d.puntaje).toBe(100);
    expect(d.banda).toBe("verde");
    expect(d.version).toBe("v1");
  });

  it("todas incumplen: 0, banda roja", () => {
    const d = desgloseConfianza(MODELO_CONFIANZA_V1, todas("incumple"));
    expect(d.puntaje).toBe(0);
    expect(d.banda).toBe("rojo");
  });

  it("el desglose muestra el aporte de cada señal (R19)", () => {
    const d = desgloseConfianza(MODELO_CONFIANZA_V1, {
      ...todas("cumple"),
      foto: "incumple",
    });
    // Sin la foto (peso 15) cumplida: 85/100 = 85, verde.
    expect(d.puntaje).toBe(85);
    const foto = d.aportes.find((a) => a.clave === "foto");
    expect(foto).toMatchObject({ peso: 15, estado: "incumple", aporte: 0 });
  });

  it("una señal no disponible no castiga: su peso se reparte (R17, CA7)", () => {
    // Batería no disponible (iPhone PWA); todo lo demás cumple → sigue 100.
    const d = desgloseConfianza(MODELO_CONFIANZA_V1, {
      ...todas("cumple"),
      bateria: "no_disponible",
    });
    expect(d.puntaje).toBe(100);
    const bateria = d.aportes.find((a) => a.clave === "bateria");
    expect(bateria).toMatchObject({ estado: "no_disponible", pesoEfectivo: 0, aporte: 0 });
  });

  it("bandas verde/amarillo/rojo", () => {
    expect(bandaDe(80)).toBe("verde");
    expect(bandaDe(79)).toBe("amarillo");
    expect(bandaDe(60)).toBe("amarillo");
    expect(bandaDe(59)).toBe("rojo");
  });

  it("puntaje de la ronda: promedio de las marcas obligatorias (R19)", () => {
    expect(puntajeRonda([100, 80, 60])).toBe(80);
    expect(puntajeRonda([])).toBe(0);
  });
});

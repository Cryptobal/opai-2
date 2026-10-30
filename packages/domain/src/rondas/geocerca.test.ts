import { describe, expect, it } from "vitest";

import { distanciaMetros } from "./distancia";
import { estadoGeocerca, permanenciaCumplida, permanenciaDefecto } from "./geocerca";
import type { Coordenada } from "./tipos";

const centro: Coordenada = { lat: -33.45, lng: -70.66 };

/** Mueve `metros` al norte del centro (aprox.): 1° lat ≈ 111.320 m. */
function alNorte(metros: number): Coordenada {
  return { lat: centro.lat + metros / 111_320, lng: centro.lng };
}

describe("estadoGeocerca (R3, CA2)", () => {
  it("a 15 m con radio 20 y precisión 8 ≤ mínima 25: dentro", () => {
    expect(
      estadoGeocerca({
        centro,
        lectura: alNorte(15),
        radioM: 20,
        precisionLecturaM: 8,
        precisionMinM: 25,
      }),
    ).toBe("dentro");
  });

  it("a 15 m con precisión 40 > mínima 25: dudosa", () => {
    expect(
      estadoGeocerca({
        centro,
        lectura: alNorte(15),
        radioM: 20,
        precisionLecturaM: 40,
        precisionMinM: 25,
      }),
    ).toBe("dudosa");
  });

  it("a 60 m con precisión 8: fuera", () => {
    expect(
      estadoGeocerca({
        centro,
        lectura: alNorte(60),
        radioM: 20,
        precisionLecturaM: 8,
        precisionMinM: 25,
      }),
    ).toBe("fuera");
  });

  it("la distancia calculada es coherente con el desplazamiento", () => {
    expect(distanciaMetros(centro, alNorte(100))).toBeGreaterThan(95);
    expect(distanciaMetros(centro, alNorte(100))).toBeLessThan(105);
  });
});

describe("permanencia (R5, CA3)", () => {
  it("con solo GPS no basta quedarse 5 s", () => {
    expect(permanenciaCumplida([0, 5], 15)).toBe(false);
  });

  it("con solo GPS, dos lecturas a 20 s cumplen la permanencia de 15 s", () => {
    expect(permanenciaCumplida([0, 20], 15)).toBe(true);
  });

  it("una sola lectura no cumple si hay permanencia mínima", () => {
    expect(permanenciaCumplida([3], 15)).toBe(false);
  });

  it("sin permanencia mínima basta una lectura dentro", () => {
    expect(permanenciaCumplida([3], 0)).toBe(true);
  });

  it("permanencia por defecto: 0 con QR, 15 con solo GPS", () => {
    expect(permanenciaDefecto(false)).toBe(0);
    expect(permanenciaDefecto(true)).toBe(15);
  });
});

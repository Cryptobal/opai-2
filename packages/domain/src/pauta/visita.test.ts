import { describe, expect, it } from "vitest";

import { clasificarLlegada, LISTA_VISITA_BASE, listaVisita } from "./visita";

const inst = { lat: -33.4, lng: -70.6, geocercaM: 300 };

describe("clasificarLlegada (CAR-83)", () => {
  it("dentro de la geocerca, con la distancia redondeada", () => {
    expect(clasificarLlegada({ instalacion: inst, lectura: { lat: -33.4009, lng: -70.6 } })).toEqual({ distanciaM: 100, geocerca: "dentro" });
  });
  it("fuera si supera el radio", () => {
    expect(clasificarLlegada({ instalacion: inst, lectura: { lat: -33.41, lng: -70.6 } }).geocerca).toBe("fuera");
  });
  it("sin GPS o sin ubicación de la instalación no hay distancia", () => {
    expect(clasificarLlegada({ instalacion: inst, lectura: null })).toEqual({ distanciaM: null, geocerca: "sin_gps" });
    expect(clasificarLlegada({ instalacion: { lat: null, lng: null, geocercaM: 300 }, lectura: { lat: 1, lng: 1 } })).toEqual({ distanciaM: null, geocerca: "sin_ubicacion" });
  });
});

describe("listaVisita (CAR-83)", () => {
  it("usa la genérica si la empresa no tiene lista o queda vacía", () => {
    expect(listaVisita(null)).toEqual(LISTA_VISITA_BASE);
    expect(listaVisita(["  ", ""])).toEqual(LISTA_VISITA_BASE);
  });
  it("limpia espacios y duplicados, y recorta textos y cantidad", () => {
    expect(listaVisita([" Extintores ", "Extintores", "Luces"])).toEqual(["Extintores", "Luces"]);
    expect(listaVisita(["x".repeat(200)])[0]).toHaveLength(120);
    expect(listaVisita(Array.from({ length: 40 }, (_, i) => `Ítem ${i}`))).toHaveLength(30);
  });
});

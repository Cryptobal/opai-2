import { describe, expect, it } from "vitest";

import { atrasoDeRonda, tramosVencidos, type RondaVigilada } from "./vigilancia";

const t = (min: number) => new Date(Date.UTC(2026, 10, 14, 12, min));
const ronda: RondaVigilada = {
  inicio: t(0),
  cierre: null,
  tiempoMaxMin: 30,
  tiempoMaxTramoMin: 10,
  obligatorios: ["a", "b", "c"],
  marcas: [],
};

describe("vigilancia de rondas (CAR-501)", () => {
  it("atrasada: vence dentro de la ventana y sin cierre a tiempo", () => {
    expect(atrasoDeRonda(ronda, t(0), t(60))).toEqual(t(30));
    expect(atrasoDeRonda({ ...ronda, cierre: t(45) }, t(0), t(60))).toEqual(t(30));
    expect(atrasoDeRonda({ ...ronda, cierre: t(25) }, t(0), t(60))).toBeNull();
    expect(atrasoDeRonda(ronda, t(31), t(60))).toBeNull();
  });

  it("tramo vencido señala el primer obligatorio pendiente", () => {
    const r = {
      ...ronda,
      marcas: [
        { puntoId: "a", hora: t(5) },
        { puntoId: "b", hora: t(25) },
      ],
    };
    expect(tramosVencidos(r, t(0), t(60))).toEqual([
      { vence: t(15), puntoId: "b" },
      { vence: t(35), puntoId: "c" },
    ]);
  });

  it("sin tiempo por tramo, cerrada a tiempo o sin pendientes no señala nada", () => {
    expect(tramosVencidos({ ...ronda, tiempoMaxTramoMin: null }, t(0), t(60))).toEqual([]);
    expect(tramosVencidos({ ...ronda, cierre: t(8) }, t(0), t(60))).toEqual([]);
    const todas = ["a", "b", "c"].map((p, i) => ({ puntoId: p, hora: t(i * 5 + 1) }));
    expect(tramosVencidos({ ...ronda, marcas: todas }, t(0), t(60))).toEqual([]);
  });
});

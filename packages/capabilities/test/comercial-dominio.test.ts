import { describe, expect, it } from "vitest";

import { diasEntre, estadoDeTipo, requisitosFaltantes, segundosEntre } from "../src/comercial/dominio";

describe("comercial · dominio", () => {
  it("el estado sale del tipo de la etapa (R8)", () => {
    expect(estadoDeTipo("abierta")).toBe("abierto");
    expect(estadoDeTipo("ganada")).toBe("ganado");
    expect(estadoDeTipo("perdida")).toBe("perdido");
  });

  it("segundos y días en la etapa anterior (R11)", () => {
    const a = new Date("2026-01-01T00:00:00Z");
    const b = new Date("2026-01-08T12:00:00Z");
    expect(segundosEntre(a, b)).toBe(7 * 86_400 + 12 * 3600);
    expect(diasEntre(a, b)).toBe(7);
    expect(diasEntre(b, a)).toBe(0);
  });

  it("requisitos de entrada faltantes por etapa (R9)", () => {
    expect(requisitosFaltantes(["monto", "fecha_cierre"], {})).toEqual(["monto", "fecha_cierre"]);
    expect(
      requisitosFaltantes(["monto", "fecha_cierre"], {
        montoEstimadoMensual: 100,
        cierreEstimado: "2026-12-01",
      }),
    ).toEqual([]);
    expect(requisitosFaltantes(["monto"], { valorMensual: 5000 })).toEqual([]);
    expect(requisitosFaltantes(["inicio_servicio"], { inicioServicioEstimado: null })).toEqual([
      "inicio_servicio",
    ]);
  });
});

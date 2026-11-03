import { describe, expect, it } from "vitest";

import {
  diaEnZona,
  grupoDeTarea,
  instanteEnZona,
  posponerTarea,
  textoVencimiento,
} from "./actividades-tareas";

// Martes 03-11-2026 10:00 en Santiago (verano, UTC−3).
const AHORA = new Date("2026-11-03T13:00:00Z");

describe("tareas · instante en la zona", () => {
  it("convierte día y hora locales a UTC con el desfase de verano e invierno", () => {
    expect(instanteEnZona("2026-11-03", "12:00")).toBe("2026-11-03T15:00:00.000Z");
    expect(instanteEnZona("2026-07-01", "12:00")).toBe("2026-07-01T16:00:00.000Z");
    expect(diaEnZona(new Date("2026-11-04T02:30:00Z"))).toBe("2026-11-03");
  });
  it("rechaza una fecha inválida", () => {
    expect(() => instanteEnZona("x", "12:00")).toThrow(RangeError);
  });
});

describe("tareas · grupos de Mis tareas", () => {
  it("separa vencidas, hoy, esta semana, más adelante y sin fecha", () => {
    expect(grupoDeTarea("2026-11-03T12:00:00Z", AHORA)).toBe("vencidas");
    expect(grupoDeTarea("2026-11-03T20:00:00Z", AHORA)).toBe("hoy");
    expect(grupoDeTarea("2026-11-08T15:00:00Z", AHORA)).toBe("semana"); // domingo
    expect(grupoDeTarea("2026-11-09T15:00:00Z", AHORA)).toBe("despues"); // lunes siguiente
    expect(grupoDeTarea(null, AHORA)).toBe("sin_fecha");
  });
});

describe("tareas · texto del vencimiento", () => {
  it("marca vencidas en peligro y las de hoy en aviso", () => {
    expect(textoVencimiento("2026-11-01T15:00:00Z", false, AHORA)).toEqual({
      texto: "Vencida hace 2 días",
      tono: "danger",
    });
    expect(textoVencimiento("2026-11-03T15:00:00Z", false, AHORA)).toEqual({
      texto: "Vence hoy 12:00",
      tono: "warning",
    });
    expect(textoVencimiento("2026-11-04T15:00:00Z", true, AHORA).texto).toBe("Vence mañana");
    expect(textoVencimiento("2026-11-20T15:00:00Z", false, AHORA).texto).toBe(
      "Vence el 20-11-2026",
    );
  });
});

describe("tareas · posponer", () => {
  it("mueve a mañana o a 3 días conservando la hora local", () => {
    expect(posponerTarea("2026-11-01T15:00:00Z", "manana", AHORA)).toBe(
      "2026-11-04T15:00:00.000Z",
    );
    expect(posponerTarea(null, "tres_dias", AHORA)).toBe("2026-11-06T12:00:00.000Z");
  });
});

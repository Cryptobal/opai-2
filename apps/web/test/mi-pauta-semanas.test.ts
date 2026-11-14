import { describe, expect, it } from "vitest";

import {
  etiquetaDia,
  etiquetaSemana,
  horario,
  horas,
  lunesDe,
  type MiTurno,
  porSemana,
} from "../app/(trabajador)/trabajador/mi-pauta/_componentes/semanas";

const turno = (fecha: string, id = fecha): MiTurno => ({
  id,
  fecha,
  inicio: `${fecha}T23:00:00.000Z`,
  fin: `${fecha}T11:00:00.000Z`,
  horas: 12,
  feriado: false,
  origen: "pauta",
  instalacion: { id: "i", nombre: "Planta" },
  puesto: null,
});

describe("Mi pauta · semanas (CAR-462)", () => {
  it("el lunes de la semana, también desde un domingo", () => {
    expect(lunesDe("2026-11-16")).toBe("2026-11-16");
    expect(lunesDe("2026-11-22")).toBe("2026-11-16");
    expect(lunesDe("2026-12-01")).toBe("2026-11-30");
  });

  it("etiqueta de la semana dentro de un mes y cruzando meses", () => {
    expect(etiquetaSemana("2026-11-16")).toBe("Semana del 16 al 22 de noviembre");
    expect(etiquetaSemana("2026-11-30")).toBe("Semana del 30 de noviembre al 6 de diciembre");
  });

  it("agrupa por semana en orden", () => {
    const s = porSemana([turno("2026-11-20"), turno("2026-11-22"), turno("2026-11-23")]);
    expect(s.map((x) => [x.lunes, x.turnos.length])).toEqual([
      ["2026-11-16", 2],
      ["2026-11-23", 1],
    ]);
  });

  it("día, horario en la zona de la empresa (cruce de medianoche) y horas", () => {
    expect(etiquetaDia("2026-11-16")).toBe("Lunes 16");
    expect(horario({ inicio: "2026-11-16T23:00:00Z", fin: "2026-11-17T11:00:00Z" }, "America/Santiago")).toBe(
      "20:00 a 08:00",
    );
    expect(horas(7.5)).toBe("7,5 h");
    expect(horas(12)).toBe("12 h");
  });
});

describe("Mi pauta · fecha de ?desde=", () => {
  it("acepta solo fechas que existen", async () => {
    const { fechaValida } = await import("../app/(trabajador)/trabajador/mi-pauta/_componentes/semanas");
    expect(fechaValida("2026-11-16")).toBe(true);
    expect(fechaValida("2026-02-30")).toBe(false);
    expect(fechaValida("2026-13-45")).toBe(false);
    expect(fechaValida(undefined)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { INDICADORES_INICIO, INDICADORES_INICIO_DEFECTO, ordenarIndicadores } from "./indicadores";

describe("indicadores de Inicio elegidos por la empresa (CAR-335 D3)", () => {
  it("respeta el orden elegido y quita los que no están disponibles", () => {
    expect(
      ordenarIndicadores(["tickets", "cobertura"], ["cobertura", "negocios", "tickets"]),
    ).toEqual(["tickets", "cobertura"]);
  });

  it("sin elección (o con una lista vacía) usa los de por defecto", () => {
    expect(ordenarIndicadores([], [...INDICADORES_INICIO])).toEqual([
      ...INDICADORES_INICIO_DEFECTO,
    ]);
  });

  it("ignora ids desconocidos y repetidos", () => {
    expect(ordenarIndicadores(["x", "negocios", "negocios"], ["negocios"])).toEqual(["negocios"]);
  });
});

describe("agenda de Inicio (CAR-335 D3)", () => {
  it("cuenta días calendario en la zona: mañana sí, hoy no, el día 14 sí y el 15 no", async () => {
    const { enAgenda } = await import("../actividades-tareas");
    const ahora = new Date("2026-11-12T15:00:00-03:00");
    expect(enAgenda("2026-11-12T20:00:00-03:00", ahora)).toBe(false);
    expect(enAgenda("2026-11-13T09:00:00-03:00", ahora)).toBe(true);
    expect(enAgenda("2026-11-26T23:00:00-03:00", ahora)).toBe(true);
    expect(enAgenda("2026-11-27T08:00:00-03:00", ahora)).toBe(false);
    expect(enAgenda(null, ahora)).toBe(false);
  });
});

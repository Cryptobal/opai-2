import { describe, expect, it } from "vitest";

import { estadoEfectivo, pesoSeveridad, transicion } from "./index";

describe("transicion", () => {
  it("resuelve desde cualquier estado activo y no desde uno cerrado", () => {
    expect(transicion("nueva", "resolver")).toBe("resuelta");
    expect(transicion("en_atencion", "resolver")).toBe("resuelta");
    expect(transicion("resuelta", "resolver")).toBeNull();
    expect(transicion("pospuesta", "resolver")).toBeNull();
  });

  it("marca falsa alarma también una pospuesta", () => {
    expect(transicion("escalada", "falsa_alarma")).toBe("falsa_alarma");
    expect(transicion("pospuesta", "falsa_alarma")).toBe("falsa_alarma");
    expect(transicion("falsa_alarma", "falsa_alarma")).toBeNull();
  });

  it("reabre solo lo cerrado y lo deja en atención", () => {
    expect(transicion("resuelta", "reabrir")).toBe("en_atencion");
    expect(transicion("falsa_alarma", "reabrir")).toBe("en_atencion");
    expect(transicion("nueva", "reabrir")).toBeNull();
  });

  it("pospone solo lo activo", () => {
    expect(transicion("en_contacto", "posponer")).toBe("pospuesta");
    expect(transicion("pospuesta", "posponer")).toBeNull();
    expect(transicion("resuelta", "posponer")).toBeNull();
  });
});

describe("estadoEfectivo", () => {
  const ahora = new Date("2026-11-14T12:00:00Z");
  it("una pospuesta vencida vuelve a su estado anterior", () => {
    const a = { estado: "pospuesta", estadoPrevio: "escalada", pospuestaHasta: new Date("2026-11-14T11:59:00Z") };
    expect(estadoEfectivo(a, ahora)).toBe("escalada");
  });
  it("una pospuesta vigente sigue pospuesta", () => {
    const a = { estado: "pospuesta", estadoPrevio: "nueva", pospuestaHasta: new Date("2026-11-14T13:00:00Z") };
    expect(estadoEfectivo(a, ahora)).toBe("pospuesta");
  });
  it("sin estado previo vuelve a nueva", () => {
    const a = { estado: "pospuesta", estadoPrevio: null, pospuestaHasta: ahora };
    expect(estadoEfectivo(a, ahora)).toBe("nueva");
  });
});

it("ordena la severidad de más grave a menos grave", () => {
  expect(pesoSeveridad("critica")).toBeLessThan(pesoSeveridad("baja"));
  expect(pesoSeveridad("otra")).toBe(4);
});

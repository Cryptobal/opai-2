import { describe, expect, it } from "vitest";

import { estaBloqueada, pinConFormato, problemaDePin, trasFallo } from "./terreno-pin";

const politica = { intentosMaximos: 5, bloqueoMinutos: 15 };
const t0 = new Date("2026-11-08T12:00:00Z");

describe("PIN de terreno", () => {
  it("exige exactamente 6 dígitos", () => {
    expect(pinConFormato("482915")).toBe(true);
    for (const malo of ["12345", "1234567", "12a456", "", " 482915"]) {
      expect(pinConFormato(malo)).toBe(false);
      expect(problemaDePin(malo)).toBe("formato");
    }
  });

  it("rechaza los PIN más adivinables", () => {
    expect(problemaDePin("111111")).toBe("repetido");
    expect(problemaDePin("123456")).toBe("secuencia");
    expect(problemaDePin("654321")).toBe("secuencia");
    expect(problemaDePin("234567")).toBe("secuencia");
    expect(problemaDePin("482915")).toBeNull();
    // 101010 no es secuencia ni repetido: sube y baja.
    expect(problemaDePin("101010")).toBeNull();
  });

  it("rechaza los últimos seis dígitos del RUT", () => {
    expect(problemaDePin("482915", "17482915-0")).toBe("igual_al_rut");
    expect(problemaDePin("482915", "7482915-0")).toBe("igual_al_rut");
    expect(problemaDePin("482916", "7482915-0")).toBeNull();
  });
});

describe("bloqueo por intentos", () => {
  it("cuenta los fallos y bloquea al llegar al máximo", () => {
    let e = { intentosFallidos: 0, bloqueadoHasta: null as Date | null };
    for (let i = 1; i <= 4; i++) {
      e = trasFallo(e, t0, politica);
      expect(e).toEqual({ intentosFallidos: i, bloqueadoHasta: null });
    }
    e = trasFallo(e, t0, politica);
    expect(e.intentosFallidos).toBe(0);
    expect(e.bloqueadoHasta?.toISOString()).toBe("2026-11-08T12:15:00.000Z");
    expect(estaBloqueada(e.bloqueadoHasta, new Date("2026-11-08T12:14:59Z"))).toBe(true);
    expect(estaBloqueada(e.bloqueadoHasta, new Date("2026-11-08T12:15:00Z"))).toBe(false);
  });

  it("tras vencer el bloqueo parte de cero", () => {
    const vencido = { intentosFallidos: 0, bloqueadoHasta: new Date("2026-11-08T11:00:00Z") };
    expect(trasFallo(vencido, t0, politica)).toEqual({ intentosFallidos: 1, bloqueadoHasta: null });
  });
});

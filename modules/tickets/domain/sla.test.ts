import { describe, expect, it } from "vitest";

import { debeAvisarSlaVencido, numeroTicket, slaVenceEnDesde } from "./sla";

describe("sla de tickets", () => {
  const creacion = new Date("2026-11-17T10:00:00.000Z");

  it("calcula vencimiento y número visible", () => {
    expect(numeroTicket("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("A1B2C3D4");
    expect(slaVenceEnDesde(creacion, 24)).toEqual(new Date("2026-11-18T10:00:00.000Z"));
    expect(slaVenceEnDesde(creacion, null)).toBeNull();
  });

  it("solo avisa en tickets vivos con SLA vencido y sin aviso previo", () => {
    const vence = slaVenceEnDesde(creacion, 1)!;
    const antes = new Date(vence.getTime() - 1);
    const despues = new Date(vence.getTime());
    expect(debeAvisarSlaVencido({ estado: "abierto", slaVenceEn: vence }, antes, false)).toBe(false);
    expect(debeAvisarSlaVencido({ estado: "abierto", slaVenceEn: vence }, despues, false)).toBe(true);
    expect(debeAvisarSlaVencido({ estado: "abierto", slaVenceEn: vence }, despues, true)).toBe(false);
    expect(debeAvisarSlaVencido({ estado: "cerrado", slaVenceEn: vence }, despues, false)).toBe(false);
  });
});
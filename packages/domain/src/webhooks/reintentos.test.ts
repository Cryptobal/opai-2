import { describe, expect, it } from "vitest";

import { cuerpoWebhook, MAX_INTENTOS_WEBHOOK, proximoIntentoWebhook } from "./reintentos";

describe("reintentos de eventos salientes (CAR-352)", () => {
  const t0 = new Date("2026-11-14T00:00:00.000Z");
  const minutos = (d: Date | null) => (d ? (d.getTime() - t0.getTime()) / 60_000 : null);

  it("espera cada vez más", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((n) => minutos(proximoIntentoWebhook(n, t0)))).toEqual([
      1, 5, 30, 120, 360, 720, 1440,
    ]);
  });

  it("después del último intento no hay más", () => {
    expect(MAX_INTENTOS_WEBHOOK).toBe(8);
    expect(proximoIntentoWebhook(8, t0)).toBeNull();
    expect(proximoIntentoWebhook(0, t0)).toBeNull();
  });

  it("el cuerpo lleva el hecho y nunca el contenido del evento", () => {
    const cuerpo = JSON.parse(
      cuerpoWebhook({
        id: "e1",
        tipo: "core.persona.creada",
        entidadTipo: "persona",
        entidadId: "p1",
        createdAt: t0,
      }),
    );
    expect(cuerpo).toEqual({
      id: "e1",
      tipo: "core.persona.creada",
      creadoEn: "2026-11-14T00:00:00.000Z",
      entidad: { tipo: "persona", id: "p1" },
      version: "2026-11-14",
    });
  });
});

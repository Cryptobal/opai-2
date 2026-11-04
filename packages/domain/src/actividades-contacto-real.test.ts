import { describe, expect, it } from "vitest";

import { esContactoReal, textoHace, ultimoContactoReal } from "./actividades-contacto-real";

const ahora = new Date("2026-11-05T15:00:00Z");
const ayer = "2026-11-04T10:00:00Z";

describe("contacto real", () => {
  it("la llamada que no contestó, la nota y la tarea no cuentan", () => {
    expect(esContactoReal({ tipo: "llamada", ocurrioEn: ayer, resultado: "no_contesto" }, ahora)).toBe(false);
    expect(esContactoReal({ tipo: "llamada", ocurrioEn: ayer, resultado: "volver_a_llamar" }, ahora)).toBe(false);
    expect(esContactoReal({ tipo: "nota", ocurrioEn: ayer }, ahora)).toBe(false);
    expect(esContactoReal({ tipo: "tarea", ocurrioEn: ayer }, ahora)).toBe(false);
  });
  it("cuentan la llamada contestada, la reunión, el correo y la visita pasados", () => {
    for (const tipo of ["reunion", "correo", "whatsapp", "visita"])
      expect(esContactoReal({ tipo, ocurrioEn: ayer }, ahora)).toBe(true);
    expect(esContactoReal({ tipo: "llamada", ocurrioEn: ayer, resultado: "contesto" }, ahora)).toBe(true);
  });
  it("una reunión futura no cuenta todavía", () => {
    expect(esContactoReal({ tipo: "reunion", ocurrioEn: "2026-11-09T10:00:00Z" }, ahora)).toBe(false);
  });
  it("elige el más reciente", () => {
    const r = ultimoContactoReal(
      [
        { tipo: "correo", ocurrioEn: "2026-10-30T10:00:00Z" },
        { tipo: "reunion", ocurrioEn: "2026-11-03T10:00:00Z" },
        { tipo: "llamada", ocurrioEn: ayer, resultado: "no_contesto" },
      ],
      ahora,
    );
    expect(r?.tipo).toBe("reunion");
    expect(ultimoContactoReal([], ahora)).toBeNull();
  });
  it("texto del plazo", () => {
    expect(textoHace("2026-11-05T09:00:00Z", ahora)).toBe("hoy");
    expect(textoHace(ayer, ahora)).toBe("ayer");
    expect(textoHace("2026-11-01T09:00:00Z", ahora)).toBe("hace 4 días");
  });
});

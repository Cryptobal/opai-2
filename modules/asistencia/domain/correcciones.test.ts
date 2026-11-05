import { describe, expect, it } from "vitest";

import {
  debeAlertarInicio, debeAlertarTermino, estadoCorreccion, respuestaValida, textoDuracion,
  tocaAvisoCompensables, valorEfectivo, venceEn,
} from "./index";

const t = (iso: string) => new Date(iso);
const sello = t("2026-12-01T12:00:00Z");

describe("máquina de estados de la corrección", () => {
  it("el plazo se cuenta desde el sello del servidor y es un parámetro", () => {
    expect(venceEn(sello, 48).toISOString()).toBe("2026-12-03T12:00:00.000Z");
    expect(venceEn(sello, 24).toISOString()).toBe("2026-12-02T12:00:00.000Z");
  });
  it("pendiente hasta el plazo, vencida después; con respuesta manda la respuesta", () => {
    const c = { selloServidor: sello, plazoHoras: 48 };
    expect(estadoCorreccion(c, null, t("2026-12-03T11:59:59Z"))).toBe("pendiente");
    expect(estadoCorreccion(c, null, t("2026-12-03T12:00:00Z"))).toBe("vencida");
    expect(estadoCorreccion(c, "objetada", t("2027-01-01T00:00:00Z"))).toBe("objetada");
    expect(estadoCorreccion(c, "aceptada", t("2026-12-01T13:00:00Z"))).toBe("aceptada");
  });
  it("objetar exige comentario; aceptar no", () => {
    expect(respuestaValida({ resultado: "aceptada" })).toBe(true);
    expect(respuestaValida({ resultado: "objetada" })).toBe(false);
    expect(respuestaValida({ resultado: "objetada", comentario: "  " })).toBe(false);
    expect(respuestaValida({ resultado: "objetada", comentario: "Sí llegué a las 8" })).toBe(true);
  });
});

describe("valor efectivo y señal de alteración", () => {
  const original = { tipo: "entrada" as const, hora: t("2026-12-01T08:12:00Z") };
  const propuesta = { tipo: "entrada" as const, hora: t("2026-12-01T08:00:00Z") };
  it("sin corrección no hay señal", () => {
    expect(valorEfectivo(original, null, null)).toEqual({ valor: original, original, senal: null });
  });
  it("pendiente: el día usa el original y se señala; el original sigue visible", () => {
    const r = valorEfectivo(original, propuesta, "pendiente");
    expect(r.valor).toBe(original);
    expect(r.senal).toBe("pendiente");
  });
  it("aceptada y vencida sin respuesta rigen con la propuesta; objetada deja el original", () => {
    expect(valorEfectivo(original, propuesta, "aceptada")).toMatchObject({ valor: propuesta, senal: "corregida" });
    expect(valorEfectivo(original, propuesta, "vencida")).toMatchObject({ valor: propuesta, senal: "vencida_aceptada" });
    expect(valorEfectivo(original, propuesta, "objetada")).toMatchObject({ valor: original, senal: "objetada" });
  });
});

describe("alertas del art. 45 con reloj simulado", () => {
  const turno = { inicio: t("2026-12-01T08:00:00Z"), fin: t("2026-12-01T20:00:00Z") };
  it("falta de inicio: a los 30 minutos, no antes, y no si ya marcó ni si el turno terminó", () => {
    expect(debeAlertarInicio(turno, false, t("2026-12-01T08:29:59Z"), 30)).toBe(false);
    expect(debeAlertarInicio(turno, false, t("2026-12-01T08:30:00Z"), 30)).toBe(true);
    expect(debeAlertarInicio(turno, true, t("2026-12-01T09:00:00Z"), 30)).toBe(false);
    expect(debeAlertarInicio(turno, false, t("2026-12-01T20:00:00Z"), 30)).toBe(false);
  });
  it("falta de término: al terminar el turno con entrada y sin salida, salvo que el empleador la apague", () => {
    expect(debeAlertarTermino(turno, true, false, t("2026-12-01T19:59:59Z"), true)).toBe(false);
    expect(debeAlertarTermino(turno, true, false, t("2026-12-01T20:00:00Z"), true)).toBe(true);
    expect(debeAlertarTermino(turno, true, false, t("2026-12-01T21:00:00Z"), false)).toBe(false);
    expect(debeAlertarTermino(turno, true, true, t("2026-12-01T21:00:00Z"), true)).toBe(false);
    expect(debeAlertarTermino(turno, false, false, t("2026-12-01T21:00:00Z"), true)).toBe(false);
  });
  it("compensables cada 30 días", () => {
    expect(tocaAvisoCompensables(null, null, t("2026-12-01T00:00:00Z"))).toBe(false);
    expect(tocaAvisoCompensables(t("2026-11-01T00:00:00Z"), null, t("2026-12-01T00:00:00Z"))).toBe(true);
    expect(tocaAvisoCompensables(t("2026-11-02T00:00:00Z"), null, t("2026-12-01T00:00:00Z"))).toBe(false);
    expect(textoDuracion(23_400)).toBe("6 h 30 min");
  });
});

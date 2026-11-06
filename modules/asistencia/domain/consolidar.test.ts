import { describe, expect, it } from "vitest";

import { consolidarDia, descansoInsuficiente, REGLAS_DESCANSO, TIPOS_JORNADA } from "./index";

const t = (s: string) => new Date(`2026-12-01T${s}:00Z`);
const turno = { inicio: t("12:00"), fin: t("20:00") };
const base = { turno, tipoJornada: "ordinaria" as const, colacion: { jornadaPactadaMin: 30, puestoMin: null }, salidaPrevia: null };

describe("consolidarDia", () => {
  it("presente con atraso y sobretiempo al segundo, menos la colación", () => {
    const d = consolidarDia({ ...base, ahora: t("23:00"), marcas: [{ tipo: "entrada", hora: new Date("2026-12-01T12:07:30Z") }, { tipo: "salida", hora: new Date("2026-12-01T20:15:00Z") }] });
    expect(d).toMatchObject({ estado: "presente", sigla: "H.E.", segundosAtraso: 450, segundosExtra: 900 });
    expect(d.minutosTrabajados).toBe(8 * 60 + 7 - 30);
  });
  it("sin marca mientras el turno no termina, ausente (S.A.) cuando terminó", () => {
    expect(consolidarDia({ ...base, ahora: t("13:00"), marcas: [] })).toMatchObject({ estado: "sin_marca", sigla: "S.A." });
    expect(consolidarDia({ ...base, ahora: t("21:00"), marcas: [] })).toMatchObject({ estado: "ausente", sigla: "S.A." });
  });
  it("entrada sin salida queda incompleta y no suma horas", () => {
    const d = consolidarDia({ ...base, ahora: t("23:00"), marcas: [{ tipo: "entrada", hora: t("12:00") }] });
    expect(d).toMatchObject({ estado: "incompleto", minutosTrabajados: 0 });
  });
  it("una ausencia registrada manda sobre la falta de marca", () => {
    const d = consolidarDia({ ...base, ahora: t("21:00"), marcas: [], ausenciaRegistrada: "L.M." });
    expect(d).toMatchObject({ estado: "ausente", sigla: "L.M." });
  });
  it("una entrada después del fin del turno no cuenta: el día queda ausente, sin atraso", () => {
    const d = consolidarDia({ ...base, ahora: t("23:00"), marcas: [{ tipo: "entrada", hora: new Date("2026-12-01T22:11:00Z") }, { tipo: "salida", hora: new Date("2026-12-01T22:11:30Z") }] });
    expect(d).toMatchObject({ estado: "ausente", sigla: "S.A.", segundosAtraso: 0, minutosTrabajados: 0 });
  });
  it("sin turno ni marcas el día no existe", () => {
    expect(consolidarDia({ ...base, turno: null, ahora: t("21:00"), marcas: [] }).estado).toBe("sin_turno");
  });
});

describe("descansos por tipo de jornada", () => {
  it("el teletrabajo exige 12 horas de desconexión; la ordinaria no fija mínimo", () => {
    expect(REGLAS_DESCANSO.teletrabajo.entreJornadasHoras).toBe(12);
    expect(descansoInsuficiente("teletrabajo", t("22:00"), new Date("2026-12-02T06:00:00Z"))).toBe(true);
    expect(descansoInsuficiente("teletrabajo", t("20:00"), new Date("2026-12-02T09:00:00Z"))).toBe(false);
    expect(descansoInsuficiente("ordinaria", t("22:00"), new Date("2026-12-02T06:00:00Z"))).toBe(false);
    expect(descansoInsuficiente("teletrabajo", null, t("12:00"))).toBe(false);
  });
  it("toda jornada tiene regla", () => {
    for (const j of TIPOS_JORNADA) expect(REGLAS_DESCANSO[j]).toBeDefined();
  });
});

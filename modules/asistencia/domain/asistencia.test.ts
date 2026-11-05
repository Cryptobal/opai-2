import { describe, expect, it } from "vitest";

import {
  atrasoSegundos,
  canonDeMarca,
  codigoVerificacion,
  colacionMinutos,
  estadoDelDia,
  hashDeMarca,
  marcaIntegra,
  resolverTipo,
  salidaAnticipadaSegundos,
  siglaDelDia,
  sobretiempoSegundos,
  trabajadosSegundos,
  verificadorPinSimulado,
  type MarcaPrevia,
  type RegistroMarca,
} from "./index";

const t = (iso: string) => new Date(iso);
const H = 3_600_000;

describe("resolverTipo", () => {
  const ahora = t("2026-12-01T20:00:00Z");
  it("sin marcas toca entrada", () => expect(resolverTipo([], ahora)).toBe("entrada"));
  it("tras una entrada toca salida", () => {
    const p: MarcaPrevia[] = [{ tipo: "entrada", horaServidor: new Date(ahora.getTime() - 8 * H) }];
    expect(resolverTipo(p, ahora)).toBe("salida");
  });
  it("12×12: una entrada de hace 25 h sigue contando (ventana de 26 h) y una de hace 27 h no", () => {
    expect(resolverTipo([{ tipo: "entrada", horaServidor: new Date(ahora.getTime() - 25 * H) }], ahora)).toBe("salida");
    expect(resolverTipo([{ tipo: "entrada", horaServidor: new Date(ahora.getTime() - 27 * H) }], ahora)).toBe("entrada");
  });
  it("nocturno: entrada 22:00, a las 06:00 del otro día toca salida", () => {
    expect(resolverTipo([{ tipo: "entrada", horaServidor: t("2026-12-01T22:00:00Z") }], t("2026-12-02T06:00:00Z"))).toBe("salida");
  });
  it("tras una salida toca entrada; la colación se cierra con su fin", () => {
    expect(resolverTipo([{ tipo: "salida", horaServidor: new Date(ahora.getTime() - H) }], ahora)).toBe("entrada");
    expect(resolverTipo([{ tipo: "inicio_colacion", horaServidor: new Date(ahora.getTime() - H) }], ahora)).toBe("fin_colacion");
  });
});

describe("atraso y sobretiempo al segundo, sin redondeo", () => {
  it("1 segundo de atraso cuenta como 1", () => {
    expect(atrasoSegundos(t("2026-12-01T08:00:00Z"), t("2026-12-01T08:00:01Z"))).toBe(1);
    expect(atrasoSegundos(t("2026-12-01T08:00:00Z"), t("2026-12-01T07:59:59Z"))).toBe(0);
  });
  it("sobretiempo de 59 s es 59 s", () => {
    expect(sobretiempoSegundos(t("2026-12-01T17:00:00Z"), t("2026-12-01T17:00:59Z"))).toBe(59);
    expect(salidaAnticipadaSegundos(t("2026-12-01T17:00:00Z"), t("2026-12-01T16:30:00Z"))).toBe(1800);
  });
  it("trabajados descuenta una sola colación", () => {
    expect(trabajadosSegundos(t("2026-12-01T08:00:00Z"), t("2026-12-01T17:00:00Z"), 60)).toBe(8 * 3600);
  });
  it("la colación de la jornada pactada manda sobre la del puesto", () => {
    expect(colacionMinutos({ jornadaPactadaMin: 45, puestoMin: 60 })).toBe(45);
    expect(colacionMinutos({ jornadaPactadaMin: null, puestoMin: 60 })).toBe(60);
    expect(colacionMinutos({ jornadaPactadaMin: null, puestoMin: null })).toBe(0);
  });
});

describe("siglas y estado del día", () => {
  const base = { hayTurno: true, hayEntrada: false, haySalida: false, sobretiempoS: 0 };
  it("con turno y sin entrada: sin asistencia; con ausencia registrada manda la ausencia", () => {
    expect(siglaDelDia(base)).toBe("S.A.");
    expect(siglaDelDia({ ...base, ausenciaRegistrada: "L.M." })).toBe("L.M.");
  });
  it("jornada ordinaria y horas extraordinarias", () => {
    expect(siglaDelDia({ ...base, hayEntrada: true, haySalida: true })).toBe("J.O.");
    expect(siglaDelDia({ ...base, hayEntrada: true, haySalida: true, sobretiempoS: 60 })).toBe("H.E.");
  });
  it("estados del día", () => {
    expect(estadoDelDia(base, false)).toBe("sin_marca");
    expect(estadoDelDia(base, true)).toBe("ausente");
    expect(estadoDelDia({ ...base, hayEntrada: true }, false)).toBe("incompleto");
    expect(estadoDelDia({ ...base, hayEntrada: true, haySalida: true }, true)).toBe("presente");
    expect(estadoDelDia({ ...base, hayTurno: false }, false)).toBe("sin_turno");
  });
});

const registro = (over: Partial<RegistroMarca> = {}): RegistroMarca => ({
  tenantId: "t", seq: 1, personaId: "p", tipo: "entrada", horaServidor: t("2026-12-01T08:00:01Z"),
  horaDispositivo: t("2026-12-01T08:00:00Z"), desfaseS: 1, origen: "en_linea", metodo: "rut_pin",
  motivoRespaldo: null, confianza: null, pruebaVida: null, dispositivoId: null, canal: "kiosco",
  instalacionId: "i", lat: -33.4, lng: -70.6, precisionM: 10, gpsEstado: "dentro", distanciaM: 5,
  turnoEsperadoId: null, turnoInicio: null, turnoFin: null, idempotencyKey: "k",
  snapshot: { empleadorRazonSocial: "Gard SpA", empleadorRut: "76.000.000-0", establecimiento: "Planta",
    mandanteRazonSocial: null, mandanteRut: null, resolucionJornada: null },
  ...over,
});

describe("hash de la marca", () => {
  it("cambia con cualquier campo del registro (snapshot, método, confianza, ubicación, hora)", async () => {
    const base = await hashDeMarca("0".repeat(64), registro());
    for (const cambio of [
      { snapshot: { ...registro().snapshot, empleadorRut: "76.111.111-1" } },
      { metodo: "pin_respaldo" as const }, { confianza: 0.9 }, { dispositivoId: "d" },
      { lat: -33.5 }, { horaServidor: t("2026-12-01T08:00:02Z") },
    ])
      expect(await hashDeMarca("0".repeat(64), registro(cambio))).not.toBe(base);
  });
  it("es determinista y depende del eslabón anterior", async () => {
    const a = await hashDeMarca("0".repeat(64), registro());
    expect(await hashDeMarca("0".repeat(64), registro())).toBe(a);
    expect(await hashDeMarca("1".repeat(64), registro())).not.toBe(a);
    expect(await marcaIntegra(a, "0".repeat(64), registro())).toBe(true);
    expect(await marcaIntegra(a, "0".repeat(64), registro({ tipo: "salida" }))).toBe(false);
  });
  it("el texto canónico no depende del orden de las claves y el código es estable", async () => {
    expect(canonDeMarca(registro())).toBe(canonDeMarca(registro()));
    const c = await codigoVerificacion("abc");
    expect(c).toMatch(/^[0-9A-F]{10}$/);
    expect(await codigoVerificacion("abc")).toBe(c);
  });
});

describe("verificador simulado con PIN", () => {
  const v = verificadorPinSimulado(new Map([["p", "123456"]]));
  it("acepta el PIN correcto y rechaza el resto", async () => {
    expect(await v.verificar({ personaId: "p", metodo: "rut_pin", credencial: "123456" })).toMatchObject({ ok: true, metodo: "rut_pin" });
    expect(await v.verificar({ personaId: "p", metodo: "rut_pin", credencial: "000000" })).toMatchObject({ ok: false });
    expect(await v.verificar({ personaId: "p", metodo: "rostro" })).toMatchObject({ ok: false, motivo: "metodo_no_disponible" });
  });
});

describe("elegirTurno", () => {
  const a = { id: "a", inicio: t("2026-12-01T08:00:00Z"), fin: t("2026-12-01T20:00:00Z") };
  const b = { id: "b", inicio: t("2026-12-02T08:00:00Z"), fin: t("2026-12-02T20:00:00Z") };
  it("toma el turno que contiene el instante", async () => {
    const { elegirTurno } = await import("./calculo");
    expect(elegirTurno([a, b], t("2026-12-01T12:00:00Z"), "salida")?.id).toBe("a");
  });
  it("entre turnos, la entrada va al más cercano por inicio y la salida por fin", async () => {
    const { elegirTurno } = await import("./calculo");
    expect(elegirTurno([a, b], t("2026-12-02T07:00:00Z"), "entrada")?.id).toBe("b");
    expect(elegirTurno([a, b], t("2026-12-01T21:00:00Z"), "salida")?.id).toBe("a");
    expect(elegirTurno([], t("2026-12-01T21:00:00Z"), "salida")).toBeNull();
  });
});

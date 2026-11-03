import { describe, expect, it } from "vitest";

import {
  agendarPasos, direccionRespuesta, esDeRespuestas, estadoVisible, generarTokenRespuesta,
  hashTokenRespuesta, instanteLocal, planBasePorVertical, proximoMomento, proximoPaso,
  tokenDeDireccion, transicionPaso, transicionSeguimiento, validarConfigPlan,
} from "./seguimiento";

const ZONA = "America/Santiago";
const sinFeriados = new Set<string>();

describe("agenda en días hábiles (R7)", () => {
  const { config } = planBasePorVertical("seguridad");
  it("cuenta 3, 7, 14 y 15 días hábiles desde el envío a las 9:00 locales, sin contar el día del ancla", () => {
    // Envío jueves 29-10-2026 12:00 Santiago; feriado 31-10 cae en sábado y 2-11 (traslado) lo marcamos.
    const ancla = instanteLocal("2026-10-29", "12:00", ZONA);
    const r = agendarPasos(config, ancla, new Set(["2026-11-02"]), ZONA);
    expect(r.map((p) => p.fecha)).toEqual(["2026-11-04", "2026-11-10", "2026-11-19", "2026-11-20"]);
    expect(r[0]!.programadoEn.toISOString()).toBe("2026-11-04T12:00:00.000Z"); // 09:00 en UTC-3 (verano)
  });
  it("un feriado entre medio corre el paso al siguiente día hábil", () => {
    const ancla = instanteLocal("2026-10-29", "12:00", ZONA);
    const sin = agendarPasos(config, ancla, sinFeriados, ZONA)[0]!.fecha;
    const con = agendarPasos(config, ancla, new Set(["2026-11-03"]), ZONA)[0]!.fecha;
    expect(sin).toBe("2026-11-03");
    expect(con).toBe("2026-11-04");
  });
  it("con días corridos y 'desde el paso anterior' encadena", () => {
    const cfg = { ...config, conteo: "corridos" as const, desde: "paso_anterior" as const, pasos: config.pasos.slice(0, 2) };
    const r = agendarPasos(cfg, instanteLocal("2026-10-29", "10:00", ZONA), sinFeriados, ZONA);
    expect(r.map((p) => p.fecha)).toEqual(["2026-11-01", "2026-11-08"]);
  });
  it("a las 23:30 locales el ancla ya es el día siguiente en UTC, pero cuenta el día local", () => {
    const r = agendarPasos(config, instanteLocal("2026-10-29", "23:30", ZONA), sinFeriados, ZONA);
    expect(r[0]!.fecha).toBe("2026-11-03");
  });
  it("0 días hábiles desde un sábado pasa al lunes", () => {
    const cfg = { ...config, pasos: [{ ...config.pasos[0]!, dias: 0 }] };
    const r = agendarPasos(cfg, instanteLocal("2026-10-31", "10:00", ZONA), sinFeriados, ZONA);
    expect(r[0]!.fecha).toBe("2026-11-02");
  });
});

describe("hora local y horario de verano", () => {
  it("09:00 en invierno es UTC-4 y en verano UTC-3", () => {
    expect(instanteLocal("2026-07-15", "09:00", ZONA).toISOString()).toBe("2026-07-15T13:00:00.000Z");
    expect(instanteLocal("2026-12-15", "09:00", ZONA).toISOString()).toBe("2026-12-15T12:00:00.000Z");
  });
  it("proximoMomento: hoy si la hora no pasó y es hábil; si no, el siguiente hábil", () => {
    const m = (iso: string) => proximoMomento(new Date(iso), "09:00", "habiles", sinFeriados, ZONA).toISOString();
    expect(m("2026-11-03T10:00:00Z")).toBe("2026-11-03T12:00:00.000Z");
    expect(m("2026-11-03T20:00:00Z")).toBe("2026-11-04T12:00:00.000Z");
    expect(m("2026-11-06T20:00:00Z")).toBe("2026-11-09T12:00:00.000Z");
  });
});

describe("validación del plan", () => {
  const base = planBasePorVertical("seguridad").config;
  it("los planes base son válidos", () => {
    expect(validarConfigPlan(base)).toEqual([]);
    expect(validarConfigPlan(planBasePorVertical("aseo").config)).toEqual([]);
  });
  it("rechaza días que bajan, hora fuera de ventana y OPAI automático fuera del correo", () => {
    const mal = { ...base, pasos: [
      { ...base.pasos[0]!, dias: 5 },
      { ...base.pasos[1]!, dias: 3, hora: "23:00", ejecutor: "opai_automatico" as const },
    ] };
    const e = validarConfigPlan(mal).join("|");
    expect(e).toMatch(/no pueden bajar/);
    expect(e).toMatch(/fuera de la ventana/);
    expect(e).toMatch(/solo aplica a correo/);
  });
  it("exige entre 1 y 20 pasos", () => {
    expect(validarConfigPlan({ ...base, pasos: [] })).toHaveLength(1);
    expect(validarConfigPlan({ ...base, pasos: Array(21).fill(base.pasos[0]) }).join()).toMatch(/1 a 20/);
  });
});

describe("estados", () => {
  it("transiciones del seguimiento", () => {
    expect(transicionSeguimiento("activo", "pausar")).toBe("pausado");
    expect(transicionSeguimiento("pausado", "reanudar")).toBe("activo");
    expect(transicionSeguimiento("terminado", "reanudar")).toBeNull();
    expect(transicionSeguimiento("cancelado", "pausar")).toBeNull();
  });
  it("transiciones del paso", () => {
    expect(transicionPaso("programado", "activar")).toBe("por_hacer");
    expect(transicionPaso("hecho", "omitir")).toBeNull();
    expect(transicionPaso("fallido", "reintentar")).toBe("por_hacer");
    expect(transicionPaso("hecho", "cancelar")).toBeNull();
  });
  it("estado visible y próximo paso", () => {
    const ahora = new Date("2026-11-10T12:00:00Z");
    const ayer = new Date("2026-11-09T12:00:00Z");
    expect(estadoVisible("activo", [{ estado: "por_hacer", programadoEn: ayer }], ahora)).toBe("con_atrasos");
    expect(estadoVisible("activo", [{ estado: "fallido", programadoEn: ayer }], ahora)).toBe("con_fallos");
    expect(estadoVisible("pausado", [], ahora)).toBe("pausado");
    expect(proximoPaso([{ estado: "hecho", orden: 1 }, { estado: "programado", orden: 3 }, { estado: "por_hacer", orden: 2 }])?.orden).toBe(2);
  });
});

describe("token de la dirección de respuesta", () => {
  it("es aleatorio, el hash es estable y la dirección se reconoce con o sin nombre", () => {
    const t = generarTokenRespuesta();
    expect(t).toMatch(/^s[0-9a-f]{32}$/);
    expect(generarTokenRespuesta()).not.toBe(t);
    expect(hashTokenRespuesta(t)).toBe(hashTokenRespuesta(t.toUpperCase().replace(/^S/, "s")));
    expect(tokenDeDireccion(direccionRespuesta(t))).toBe(t);
    expect(tokenDeDireccion(`Atlas <${direccionRespuesta(t).toUpperCase()}>`)).toBe(t);
  });
  it("descarta dominios ajenos y locales que no son tokens", () => {
    expect(esDeRespuestas("x@inbound.opai.cl")).toBe(false);
    expect(tokenDeDireccion("s" + "a".repeat(32) + "@inbound.opai.cl")).toBeNull();
    expect(tokenDeDireccion("hola@respuestas.opai.cl")).toBeNull();
    expect(tokenDeDireccion("s" + "a".repeat(31) + "@respuestas.opai.cl")).toBeNull();
    expect(esDeRespuestas("hola@respuestas.opai.cl")).toBe(true);
  });
});

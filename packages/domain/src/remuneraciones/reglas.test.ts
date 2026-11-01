import { describe, expect, it } from "vitest";
import { PCT_ESCALA, UF_ESCALA } from "../dinero";
import { costoEmpleadorPorPersona } from "./costo-empresa";
import { horasExtraClp } from "./horas-extra";
import { minimoPorJornada } from "./jornada";
import { impuestoUnico } from "./impuesto";
import { entradaReferencia, juegoReferencia, publicacionesReferencia } from "./referencia.fixture";
import { juegoDeValores } from "./valores";

describe("R17, R19–R21 y contrato congelable para CPQ", async () => {
  const juego = await juegoReferencia();
  it("parcial 18 h; sueldo ligado al IMM cambia solo con su juego", async () => {
    expect(minimoPorJornada(553_553, 18 * 60, 42)).toBe(237_237);
    expect(minimoPorJornada(553_553, 31 * 60, 42)).toBe(553_553);
    const e = entradaReferencia();
    e.sueldo = { sueldoBaseClp: "imm", colacionClp: 0, movilizacionClp: 0, gratificacion: "legal_25", haberes: [] };
    e.jornadaMinutosSemanales = 18 * 60;
    expect(costoEmpleadorPorPersona(e, juego).desglose.haberes.sueldoBase).toBe(237_237);
    const valores = publicacionesReferencia();
    valores.push({ indicador: "imm", valor: 560_000, vigenteDesde: "2026-10-29", fuente: "prueba",
      estado: "vigente", verificacion: "por_verificar" });
    const futuro = await juegoDeValores("2026-10-29", valores);
    expect(costoEmpleadorPorPersona(e, futuro).desglose.haberes.sueldoBase).toBe(240_000);
  });
  it("hora extra legal de 42 h = base/120; respeta IMM y jornada fraccionaria", () => {
    const datos = { sueldoBaseClp: 600_000, immClp: 553_553, jornadaLegalHoras: 42,
      jornadaMinutosSemanales: 42 * 60, minutosExtra: 60 };
    expect(horasExtraClp(datos)).toBe(5_000);
    expect(horasExtraClp(datos)).not.toBe(600_000 / 30 / 8 * 1.5);
    expect(horasExtraClp({ ...datos, minutosExtra: 120 })).toBe(10_000);
    expect(horasExtraClp({ ...datos, sueldoBaseClp: 1 })).toBe(4_613);
    expect(horasExtraClp({ ...datos, jornadaMinutosSemanales: 18 * 60, sueldoBaseClp: 237_237 })).toBe(4_613);
    expect(() => horasExtraClp({ ...datos, jornadaMinutosSemanales: 0 })).toThrow();
  });
  it("gratificación legal incluye bonos mensuales según DT, fija y ninguna; tope IMM", () => {
    const e = entradaReferencia(600_000);
    if (!("capa" in e.sueldo)) e.sueldo.haberes = [{ tipo: "bono_fijo", nombre: "Bono ficticio", monto: 100_000, imponible: true }];
    expect(costoEmpleadorPorPersona(e, juego).desglose.haberes.gratificacion).toBe(175_000);
    expect(costoEmpleadorPorPersona(entradaReferencia(1_000_000), juego).desglose.haberes.gratificacion).toBe(219_115);
    if (!("capa" in e.sueldo)) { e.sueldo.gratificacion = "monto_fijo"; e.sueldo.gratificacionMontoClp = 50_000; }
    expect(costoEmpleadorPorPersona(e, juego).desglose.haberes.gratificacion).toBe(50_000);
    if (!("capa" in e.sueldo)) e.sueldo.gratificacion = "ninguna";
    expect(costoEmpleadorPorPersona(e, juego).desglose.haberes.gratificacion).toBe(0);
  });
  it("topes previsionales no topan el sueldo; indemnización hasta 90 UF y 11 años", () => {
    const e = entradaReferencia(10_000_000);
    const r = costoEmpleadorPorPersona(e, juego);
    expect(r.desglose.basePrevisionalClp).toBe(3_711_331);
    expect(r.desglose.baseCesantiaClp).toBe(5_575_244);
    expect(r.desglose.haberes.sueldoBase).toBe(10_000_000);
    expect(r.desglose.indemnizacionClp).toBe(309_278);
    e.provisiones.mesesAntiguedad = 132;
    expect(costoEmpleadorPorPersona(e, juego).desglose.indemnizacionClp).toBe(0);
  });
  it("plazo fijo: empleador 3%, trabajador 0; Isapre toma plan UF si supera legal", () => {
    const e = entradaReferencia(); e.contrato = "plazo_fijo";
    e.salud = { tipo: "isapre", planUf: 2 * UF_ESCALA };
    const r = costoEmpleadorPorPersona(e, juego);
    expect(r.desglose.cesantiaEmpleadorClp).toBe(20_758);
    expect(r.desglose.cesantiaTrabajadorClp).toBe(0);
    expect(r.desglose.saludClp).toBe(82_474);
  });
  it("reforma que incluye SIS no lo duplica; permite calendario anterior con SIS aparte", async () => {
    const r = costoEmpleadorPorPersona(entradaReferencia(), juego);
    expect(r.desglose.sisClp + r.desglose.reformaClp).toBe(24_218);
    const valores = publicacionesReferencia();
    for (const v of valores) if (v.indicador === "reforma") v.valor = { tasa: 10_000, incluyeSis: false };
    const anterior = costoEmpleadorPorPersona(entradaReferencia(), await juegoDeValores(juego.fecha, valores));
    expect(anterior.desglose.reformaClp).toBe(6_919);
    expect(anterior.desglose.sisClp).toBe(12_317);
  });
  it("impuesto continuo al límite exento, segundo tramo y tramo abierto", () => {
    expect(impuestoUnico(974_038, juego).montoClp).toBe(0);
    expect(impuestoUnico(974_039, juego).montoClp).toBe(0);
    expect(impuestoUnico(1_000_000, juego).montoClp).toBe(1_038);
    expect(impuestoUnico(30_000_000, juego).montoClp).toBe(9_199_098);
  });
  it("congela capa y entrada sin mutarlas; rechaza capa incompleta/histórica/fuera de fecha", () => {
    const e = entradaReferencia();
    e.sueldo = { capa: { id: "capa-ficticia", nivel: "puesto", sueldoBase: 553_553, colacion: 20_000,
      movilizacion: 20_000, gratificacion: "legal_25", vigenteDesde: "2026-01-01", estado: "vigente", items: [] } };
    const copia = structuredClone(e);
    const r = costoEmpleadorPorPersona(e, juego);
    expect(e).toEqual(copia);
    expect(r.entradaUsada).toEqual(copia);
    expect(r.capaUsada).toEqual("capa" in e.sueldo ? e.sueldo.capa : null);
    expect(Object.isFrozen(r.entradaUsada.sueldo)).toBe(true);
    if ("capa" in e.sueldo) e.sueldo.capa.sueldoBase = null;
    expect(() => costoEmpleadorPorPersona(e, juego)).toThrow("incompleta");
  });
  it("probabilidad contable explícita y advertencia sueldo bajo IMM", () => {
    const e = entradaReferencia(100_000);
    e.provisiones.probabilidadIndemnizacion = PCT_ESCALA / 2;
    expect(costoEmpleadorPorPersona(e, juego).desglose.indemnizacionClp).toBe(5_208);
    expect(costoEmpleadorPorPersona(e, juego).advertencias.join()).toContain("danger");
  });
});

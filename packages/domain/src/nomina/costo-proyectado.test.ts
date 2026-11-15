import { describe, expect, it } from "vitest";

import type { Estructura } from "../estructuras";
import { costoEmpleadorPorPersona } from "../remuneraciones/costo-empresa";
import { juegoDeValores } from "../remuneraciones/valores";
import { entradaReferencia, publicacionesReferencia } from "../remuneraciones/referencia.fixture";
import {
  costoProyectadoDelMes,
  mesesQueCubren,
  previredPorDefecto,
  type PersonaACostear,
} from "./costo-proyectado";

const capa = (sueldoBase: number | null): Estructura => ({
  id: "e1", nivel: "puesto", sueldoBase, colacion: 0, movilizacion: 0, gratificacion: "legal_25",
  gratificacionMonto: null, vigenteDesde: "2026-01-01", vigenteHasta: null, estado: "vigente", items: [],
});
const persona = (over: Partial<PersonaACostear> = {}): PersonaACostear => ({
  capa: capa(553_553), contrato: "indefinido", afp: "modelo", salud: { tipo: "fonasa" },
  jornadaMinutosSemanales: 42 * 60, anticipo: null, ...over,
});
const NOV = { anio: 2026, mes: 11 };
const plazos = { sueldoDia: 31, sueldoMesSiguiente: false, previredFecha: "2026-12-13" };
const juego = () => juegoDeValores("2026-11-01", publicacionesReferencia());

describe("nomina · costo proyectado", () => {
  it("cubre desde el mes anterior a «desde» hasta el mes de «hasta», cruzando el año", () => {
    expect(mesesQueCubren("2027-01-10", "2027-03-05")).toEqual([
      { anio: 2026, mes: 12 }, { anio: 2027, mes: 1 }, { anio: 2027, mes: 2 }, { anio: 2027, mes: 3 },
    ]);
    expect(previredPorDefecto({ anio: 2026, mes: 12 })).toBe("2027-01-13");
  });

  it("suma líquido y cotizaciones del motor, con fecha de pago y cantidad de personas", async () => {
    const j = await juego();
    const r = costoProyectadoDelMes(NOV, [persona(), persona()], j, 2_700, plazos);
    const uno = costoEmpleadorPorPersona({ ...entradaReferencia(), mutualAdicional: 2_700 }, j);
    const d = uno.desglose;
    const previred = d.afpClp + d.saludClp + d.cesantiaTrabajadorClp + d.sisClp + d.cesantiaEmpleadorClp + d.mutualClp + d.reformaClp;
    expect(r.sinCalculo).toBe(0);
    expect(r.items).toEqual([
      { fecha: "2026-11-30", concepto: "sueldos", monto: 2 * uno.liquidoEstimadoClp, personas: 2, estimado: true },
      { fecha: "2026-12-13", concepto: "previred", monto: 2 * previred, personas: 2, estimado: true },
    ]);
  });

  it("el anticipo se descuenta de los sueldos y se agrupa por su día (monto fijo y porcentaje)", async () => {
    const j = await juego();
    const r = costoProyectadoDelMes(NOV, [
      persona({ anticipo: { modo: "monto_fijo", valor: 100_000, diaMes: 15 } }),
      persona({ anticipo: { modo: "porcentaje_base", valor: 2_000, diaMes: 15 } }),
    ], j, 2_700, { ...plazos, sueldoMesSiguiente: true, sueldoDia: 5 });
    const anticipo = r.items.find((i) => i.concepto === "anticipo");
    const sueldos = r.items.find((i) => i.concepto === "sueldos");
    expect(anticipo).toMatchObject({ fecha: "2026-11-15", monto: 100_000 + 110_711, personas: 2 });
    expect(sueldos?.fecha).toBe("2026-12-05");
    const liquido = costoEmpleadorPorPersona({ ...entradaReferencia(), mutualAdicional: 2_700 }, j).liquidoEstimadoClp;
    expect((sueldos?.monto ?? 0) + (anticipo?.monto ?? 0)).toBe(2 * liquido);
  });

  it("quien no tiene capa completa no se costea ni aparece en los totales", async () => {
    const r = costoProyectadoDelMes(NOV, [persona(), persona({ capa: capa(null) })], await juego(), 0, plazos);
    expect(r.sinCalculo).toBe(1);
    expect(r.items.every((i) => i.personas === 1)).toBe(true);
  });

  it("los sueldos de diciembre pagados el mes siguiente caen en enero", async () => {
    const r = costoProyectadoDelMes({ anio: 2026, mes: 12 }, [persona()], await juego(), 0,
      { sueldoDia: 5, sueldoMesSiguiente: true, previredFecha: previredPorDefecto({ anio: 2026, mes: 12 }) });
    expect(r.items.map((i) => [i.concepto, i.fecha])).toEqual([["sueldos", "2027-01-05"], ["previred", "2027-01-13"]]);
  });

  it("isapre: cotiza al menos el plan en UF", async () => {
    const j = await juego();
    const fonasa = costoProyectadoDelMes(NOV, [persona()], j, 0, plazos).items.find((i) => i.concepto === "previred");
    const isapre = costoProyectadoDelMes(NOV, [persona({ salud: { tipo: "isapre", planUf: 50_000 } })], j, 0, plazos)
      .items.find((i) => i.concepto === "previred");
    expect((isapre?.monto ?? 0)).toBeGreaterThan(fonasa?.monto ?? 0);
  });

  it("sin personas no hay ítems", async () => {
    expect(costoProyectadoDelMes(NOV, [], await juego(), 0, plazos)).toEqual({ items: [], sinCalculo: 0 });
  });
});

import { describe, expect, it } from "vitest";

import { embudoDe, perdidasDe, porResponsable, pronosticoDe, resumenCierre, type Abierto, type Cerrado } from "../src/comercial/informes-tablero-calculo";
import { canalesDe } from "../src/comercial/informes-tablero-canales";
import { haceMeses, mesesDesde, rangosDe } from "../src/comercial/informes-tablero-periodo";

const abierto = (x: Partial<Abierto>): Abierto => ({ valorMensual: null, montoEstimadoMensual: 1_000_000, etapaId: "e1", probabilidad: 50, cierreEstimado: null, responsableId: null, ...x });
const cerrado = (x: Partial<Cerrado>): Cerrado => ({ valorMensual: null, montoEstimadoMensual: 2_000_000, estado: "ganado", cerradoEn: "2026-11-10", creadoEn: "2026-10-01", responsableId: null, motivoPerdidaId: null, competidor: null, ...x });

describe("tablero de reportes comerciales · períodos", () => {
  it("mes, trimestre y año en curso con su período anterior completo", () => {
    expect(rangosDe("mes", "2026-11-11")).toEqual({ desde: "2026-11-01", hasta: "2026-11-11", anterior: { desde: "2026-10-01", hasta: "2026-10-31" } });
    expect(rangosDe("trimestre", "2026-11-11")).toEqual({ desde: "2026-10-01", hasta: "2026-11-11", anterior: { desde: "2026-07-01", hasta: "2026-09-30" } });
    expect(rangosDe("anio", "2026-11-11").anterior).toEqual({ desde: "2025-01-01", hasta: "2025-12-31" });
    expect(rangosDe("mes", "2026-01-05").anterior).toEqual({ desde: "2025-12-01", hasta: "2025-12-31" });
  });
  it("los meses del pronóstico cruzan el año y hace 12 meses parte el día 1", () => {
    expect(mesesDesde("2026-11-11", 4)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(haceMeses("2026-11-11", 12)).toBe("2025-11-01");
  });
});

describe("tablero de reportes comerciales · cálculo", () => {
  const rango = { desde: "2026-11-01", hasta: "2026-11-30" };
  it("cierre: conversión sobre cerrados y ciclo de creación a ganado", () => {
    const r = resumenCierre([cerrado({}), cerrado({ estado: "perdido", montoEstimadoMensual: 500_000 }), cerrado({ cerradoEn: "2026-10-20" })], rango);
    expect(r).toEqual({ ganados: 1, perdidos: 1, montoGanadoMensualClp: 2_000_000, montoPerdidoMensualClp: 500_000, conversionPct: 50, cicloPromedioDias: 40 });
    expect(resumenCierre([], rango)).toMatchObject({ conversionPct: null, cicloPromedioDias: null });
  });
  it("embudo: solo etapas abiertas, días promedio y avance a una etapa posterior o a ganado", () => {
    const etapas = [{ id: "e1", orden: 1, tipo: "abierta" }, { id: "e2", orden: 2, tipo: "abierta" }, { id: "g", orden: 3, tipo: "ganada" }, { id: "p", orden: 4, tipo: "perdida" }];
    const pasos = [
      { deEtapaId: "e1", aEtapaId: "e2", segundos: 86_400 * 4 },
      { deEtapaId: "e1", aEtapaId: "p", segundos: 86_400 * 8 },
      { deEtapaId: "e2", aEtapaId: "e1", segundos: null },
      { deEtapaId: "e2", aEtapaId: "g", segundos: 86_400 * 2 },
    ];
    const r = embudoDe(etapas, [abierto({}), abierto({ etapaId: "e2", valorMensual: 3_000_000 })], pasos);
    expect(r).toEqual([
      { etapaId: "e1", cantidad: 1, montoMensualClp: 1_000_000, diasPromedio: 6, avanzaPct: 50 },
      { etapaId: "e2", cantidad: 1, montoMensualClp: 3_000_000, diasPromedio: 2, avanzaPct: 50 },
    ]);
    expect(embudoDe(etapas, [], [])[0]).toMatchObject({ diasPromedio: null, avanzaPct: null });
  });
  it("pronóstico: pondera por probabilidad y deja aparte lo que no cae en los meses", () => {
    const r = pronosticoDe([abierto({ cierreEstimado: "2026-11-20" }), abierto({ cierreEstimado: "2026-12-01", probabilidad: 10 }), abierto({}), abierto({ cierreEstimado: "2026-01-01" })], ["2026-11", "2026-12"]);
    expect(r.meses).toEqual([{ mes: "2026-11", montoMensualClp: 1_000_000, ponderadoClp: 500_000 }, { mes: "2026-12", montoMensualClp: 1_000_000, ponderadoClp: 100_000 }]);
    expect(r.fueraDeRango).toEqual({ cantidad: 2, ponderadoClp: 1_000_000 });
    expect(r.totalPonderadoClp).toBe(1_600_000);
  });
  it("pérdidas: motivos de mayor a menor, sin motivo aparte y tres competidores", () => {
    const p = (m: string | null, c: string | null = null) => cerrado({ estado: "perdido", motivoPerdidaId: m, competidor: c });
    const r = perdidasDe([p("precio", "Alfa"), p("precio", " Alfa "), p("plazo", "Beta"), p(null), cerrado({}), p("viejo", "Zeta")].map((c, i) => (i === 5 ? { ...c, cerradoEn: "2020-01-01" } : c)), "2025-11-01");
    expect(r.motivos).toEqual([{ motivoId: "precio", cantidad: 2 }, { motivoId: "plazo", cantidad: 1 }]);
    expect(r.sinMotivo).toBe(1);
    expect(r.competidores).toEqual([{ nombre: "Alfa", cantidad: 2 }, { nombre: "Beta", cantidad: 1 }]);
  });
  it("por responsable: cartera de hoy y cierres del período; «sin responsable» es una fila", () => {
    const r = porResponsable([abierto({ responsableId: "u1" }), abierto({})], [cerrado({ responsableId: "u1" }), cerrado({ responsableId: "u2", estado: "perdido" }), cerrado({ responsableId: "u2", cerradoEn: "2026-09-01" })], rango);
    expect(r.map((x) => x.responsableId).sort()).toEqual([null, "u1", "u2"].sort());
    expect(r.find((x) => x.responsableId === "u1")).toMatchObject({ abiertos: 1, ponderadoClp: 500_000, ganados: 1, conversionPct: 100 });
    expect(r.find((x) => x.responsableId === "u2")).toMatchObject({ abiertos: 0, ganados: 0, perdidos: 1, conversionPct: 0 });
  });
  it("canales: solicitudes, las que llegaron a negocio y las ganadas", () => {
    const neg = (estado: string) => ({ estado, valorMensual: 700_000, montoEstimadoMensual: null });
    const r = canalesDe([{ canal: "manual", negocio: null }, { canal: "manual", negocio: neg("abierto") }, { canal: "manual", negocio: neg("ganado") }, { canal: "correo", negocio: null }], ["manual", "correo", "agente"]);
    expect(r[0]).toEqual({ canal: "manual", solicitudes: 3, negocios: 2, ganados: 1, montoGanadoMensualClp: 700_000, conversionPct: 67 });
    expect(r[2]).toMatchObject({ canal: "agente", solicitudes: 0, conversionPct: 0 });
  });
});

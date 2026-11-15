import { describe, expect, it } from "vitest";

import { claveLibre, emparejarMovimientos, glosasParecidas } from "./emparejar";

// Datos sintéticos (CAR-341): nada de montos, glosas ni RUT reales.
const ex = (id: string, fecha: string, monto: number, glosa: string, referencia: string | null = null) => ({
  id,
  fecha,
  monto,
  glosa,
  referencia,
});
const ent = (fecha: string, monto: number, glosa: string, referencia: string | null = null) => ({
  fecha,
  monto,
  glosa,
  referencia,
});

describe("glosasParecidas", () => {
  it("reconoce la misma operación rotulada distinto por el banco en línea y la cartola", () => {
    expect(glosasParecidas("Transf a Proveedor Ficticio SpA", "0761234 TRANSF A PROVEEDOR FICTICIO")).toBe(true);
    expect(glosasParecidas("Abono cliente ficticio", "ABONO CLIENTE FICTICIO")).toBe(true);
    expect(glosasParecidas("Pago luz ficticia", "Transf a proveedor ficticio")).toBe(false);
  });
});

describe("emparejarMovimientos", () => {
  it("un movimiento de la sincronización con otra fecha en la cartola es el mismo", () => {
    const existentes = [ex("a", "2026-11-12", -50_000, "Transf a Proveedor Ficticio")];
    const r = emparejarMovimientos([ent("2026-11-13", -50_000, "TRANSF A PROVEEDOR FICTICIO 0761234")], existentes);
    expect(r.get(0)).toEqual({ existenteId: "a", por: "parecida", fechaExistente: "2026-11-12" });
  });

  it("subir la misma cartola dos veces no crea nada", () => {
    const filas = [ent("2026-10-01", 1000, "ABONO X"), ent("2026-10-01", 1000, "ABONO X"), ent("2026-10-02", -5, "COMISION")];
    const existentes = filas.map((f, i) => ex(`e${i}`, f.fecha, f.monto, f.glosa));
    const r = emparejarMovimientos(filas, existentes);
    expect([...r.values()].map((v) => v.por)).toEqual(["exacta", "exacta", "exacta"]);
    expect(new Set([...r.values()].map((v) => v.existenteId)).size).toBe(3);
  });

  it("dos filas idénticas frente a un solo existente: una es duplicado y la otra es nueva", () => {
    const filas = [ent("2026-10-01", 1000, "ABONO X"), ent("2026-10-01", 1000, "ABONO X")];
    const r = emparejarMovimientos(filas, [ex("e0", "2026-10-01", 1000, "ABONO X")]);
    expect(r.size).toBe(1);
    const ocupadas = new Set(["base"]);
    expect(claveLibre("base", ocupadas)).not.toBe("base");
  });

  it("una provisoria seguida de la histórica del mismo mes solo agrega lo que faltaba", () => {
    const provisoria = [ex("p1", "2026-11-03", 20_000, "Abono cliente ficticio"), ex("p2", "2026-11-04", -3_000, "Comision mantencion")];
    const historica = [
      ent("2026-11-03", 20_000, "ABONO CLIENTE FICTICIO"),
      ent("2026-11-05", -3_000, "COMISION MANTENCION"),
      ent("2026-11-20", -7_000, "PAGO SERVICIO FICTICIO"),
    ];
    const r = emparejarMovimientos(historica, provisoria);
    expect(r.get(0)?.existenteId).toBe("p1");
    expect(r.get(1)).toMatchObject({ existenteId: "p2", fechaExistente: "2026-11-04" });
    expect(r.has(2)).toBe(false);
  });

  it("el número de documento manda aunque la glosa cambie", () => {
    const r = emparejarMovimientos([ent("2026-11-13", -9_000, "OTRA GLOSA", "000123456")], [ex("d", "2026-11-12", -9_000, "Algo", "123456")]);
    expect(r.get(0)?.por).toBe("referencia");
  });

  it("dos operaciones iguales en días distintos no se cruzan: gana la fecha más cercana, uno a uno", () => {
    const existentes = [ex("a", "2026-11-10", -1_000, "Pago ficticio"), ex("b", "2026-11-12", -1_000, "Pago ficticio")];
    const r = emparejarMovimientos([ent("2026-11-12", -1_000, "PAGO FICTICIO"), ent("2026-11-11", -1_000, "PAGO FICTICIO")], existentes);
    expect(r.get(0)?.existenteId).toBe("b");
    expect(r.get(1)?.existenteId).toBe("a");
  });

  it("fuera de la tolerancia, con otro monto o con glosa distinta es un movimiento nuevo", () => {
    const existentes = [ex("a", "2026-11-01", -1_000, "Pago ficticio")];
    expect(emparejarMovimientos([ent("2026-11-05", -1_000, "PAGO FICTICIO")], existentes).size).toBe(0);
    expect(emparejarMovimientos([ent("2026-11-01", -1_001, "PAGO FICTICIO")], existentes).size).toBe(0);
    expect(emparejarMovimientos([ent("2026-11-02", -1_000, "COMPRA DISTINTA")], existentes).size).toBe(0);
  });
});

describe("claveLibre", () => {
  it("entrega la base o el siguiente ordinal libre", () => {
    const ocupadas = new Set(["x", "x~2"]);
    expect(claveLibre("x", ocupadas)).toBe("x~3");
    expect(claveLibre("y", ocupadas)).toBe("y");
  });
});

describe("emparejarMovimientos: pasada por monto con el banco en línea (CAR-450)", () => {
  const enLinea = (e: { id: string }) => e.id.startsWith("w");

  it("empareja glosas distintas si el movimiento del banco en línea es el único candidato", () => {
    const existentes = [ex("w1", "2026-11-03", -42_000, "TEF PROVEEDOR FICT")];
    const r = emparejarMovimientos([ent("2026-11-05", -42_000, "PAGO PROVEEDORES 0099")], existentes, { porMontoSi: enLinea });
    expect(r.get(0)).toEqual({ existenteId: "w1", por: "monto", fechaExistente: "2026-11-03" });
  });

  it("sin la opción, o con un existente que no es del banco en línea, la glosa distinta sigue siendo nueva", () => {
    expect(emparejarMovimientos([ent("2026-11-05", -42_000, "PAGO PROVEEDORES")], [ex("w1", "2026-11-03", -42_000, "TEF X")]).size).toBe(0);
    const r = emparejarMovimientos([ent("2026-11-05", -42_000, "PAGO PROVEEDORES")], [ex("c1", "2026-11-03", -42_000, "TEF X")], { porMontoSi: enLinea });
    expect(r.size).toBe(0);
  });

  it("dos montos iguales en la ventana no se emparejan por monto (ambiguo)", () => {
    const dosExistentes = [ex("w1", "2026-11-03", -10_000, "TEF A"), ex("w2", "2026-11-04", -10_000, "TEF B")];
    expect(emparejarMovimientos([ent("2026-11-04", -10_000, "PAGO 1")], dosExistentes, { porMontoSi: enLinea }).size).toBe(0);
    const dosEntrantes = [ent("2026-11-03", -10_000, "PAGO 1"), ent("2026-11-05", -10_000, "PAGO 2")];
    expect(emparejarMovimientos(dosEntrantes, [ex("w1", "2026-11-04", -10_000, "TEF A")], { porMontoSi: enLinea }).size).toBe(0);
  });

  it("las pasadas por glosa van primero y liberan la ambigüedad", () => {
    const existentes = [ex("w1", "2026-11-03", -10_000, "Pago luz ficticia"), ex("w2", "2026-11-04", -10_000, "TEF B")];
    const entrantes = [ent("2026-11-04", -10_000, "PAGO LUZ FICTICIA"), ent("2026-11-05", -10_000, "CARGO 77")];
    const r = emparejarMovimientos(entrantes, existentes, { porMontoSi: enLinea });
    expect(r.get(0)).toMatchObject({ existenteId: "w1", por: "parecida" });
    expect(r.get(1)).toMatchObject({ existenteId: "w2", por: "monto" });
  });

  it("fuera de la tolerancia no empareja", () => {
    const r = emparejarMovimientos([ent("2026-11-08", -42_000, "PAGO")], [ex("w1", "2026-11-03", -42_000, "TEF")], { porMontoSi: enLinea });
    expect(r.size).toBe(0);
  });
});

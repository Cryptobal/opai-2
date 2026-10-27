import { describe, expect, it } from "vitest";

import { type Estructura, haberes } from "./estructuras";
import { combinarPorConcepto } from "./estructuras-conceptos";

const nivel = (n: Estructura["nivel"], cambios: Partial<Estructura>): Estructura => ({
  id: n,
  nivel: n,
  sueldoBase: null,
  colacion: null,
  movilizacion: null,
  gratificacion: null,
  vigenteDesde: "2026-01-01",
  estado: "vigente",
  items: [],
  ...cambios,
});

// Ejemplo del diseño aprobado (pantalla 57): Supervisor en CD Pudahuel con excepción de movilización.
const cargo = nivel("cargo", {
  sueldoBase: 850_000,
  colacion: 45_000,
  movilizacion: 60_000,
  gratificacion: "legal_25",
});
const puesto = nivel("puesto", {
  sueldoBase: 880_000,
  items: [{ tipo: "bono_fijo", nombre: "Bono de responsabilidad", monto: 40_000, imponible: true }],
});
const persona = nivel("persona", { movilizacion: 75_000 });

describe("proyección sin herencia entre capas", () => {
  it("los conceptos faltantes no se rellenan desde otra capa", () => {
    const r = combinarPorConcepto({ persona, puesto, cargo });
    const de = (clave: string) => r.conceptos.find((c) => c.clave === clave);
    expect(de("sueldoBase")).toMatchObject({ final: null, origen: "persona" });
    expect(de("colacion")).toMatchObject({ final: null, origen: "persona" });
    expect(de("movilizacion")).toMatchObject({ final: 75_000, origen: "persona" });
    expect(de("gratificacion")).toMatchObject({ final: null, origen: "persona" });
    expect(de("bono:Bono de responsabilidad")).toBeUndefined();
    expect(de("movilizacion")?.valores).toEqual({ persona: 75_000, puesto: null, cargo: null, instalacion: null });
  });

  it("una capa completa alimenta los haberes sin aportes del cargo", () => {
    const completa = { ...puesto, colacion: 0, movilizacion: 0, gratificacion: "ninguna" as const };
    const { estructura } = combinarPorConcepto({ persona: null, puesto: completa, cargo });
    if (!estructura) throw new Error("sin estructura");
    const h = haberes(estructura, 529_000);
    // Imponible sin gratificación: 880.000 + 40.000; no imponible: 45.000 + 75.000.
    expect(h.imponible - h.gratificacion).toBe(920_000);
    expect(h.noImponible).toBe(0);
  });

  it("un bono del mismo nombre en un nivel más específico reemplaza al general", () => {
    const conBono = (n: Estructura["nivel"], monto: number) =>
      nivel(n, { items: [{ tipo: "bono_fijo", nombre: "Nocturno", monto, imponible: true }] });
    const r = combinarPorConcepto({
      persona: conBono("persona", 70_000),
      puesto: null,
      cargo: { ...cargo, items: conBono("cargo", 60_000).items },
    });
    expect(r.estructura?.items).toEqual([
      { tipo: "bono_fijo", nombre: "Nocturno", monto: 70_000, imponible: true },
    ]);
  });

  it("sin niveles no hay estructura", () => {
    expect(combinarPorConcepto({ persona: null, puesto: null, cargo: null }).estructura).toBeNull();
  });
});

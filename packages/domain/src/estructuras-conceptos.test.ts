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

describe("sueldo por concepto en tres niveles", () => {
  it("cada concepto toma el nivel más específico que lo define", () => {
    const r = combinarPorConcepto({ persona, puesto, cargo });
    const de = (clave: string) => r.conceptos.find((c) => c.clave === clave);
    expect(de("sueldoBase")).toMatchObject({ final: 880_000, origen: "puesto" });
    expect(de("colacion")).toMatchObject({ final: 45_000, origen: "cargo" });
    expect(de("movilizacion")).toMatchObject({ final: 75_000, origen: "persona" });
    expect(de("gratificacion")).toMatchObject({ final: "legal_25", origen: "cargo" });
    expect(de("bono:Bono de responsabilidad")?.origen).toBe("puesto");
    expect(de("movilizacion")?.valores).toEqual({ persona: 75_000, puesto: null, cargo: 60_000 });
  });

  it("la estructura combinada alimenta los haberes (fijo antes de gratificación)", () => {
    const { estructura } = combinarPorConcepto({ persona, puesto, cargo });
    if (!estructura) throw new Error("sin estructura");
    const h = haberes(estructura, 529_000);
    // Imponible sin gratificación: 880.000 + 40.000; no imponible: 45.000 + 75.000.
    expect(h.imponible - h.gratificacion).toBe(920_000);
    expect(h.noImponible).toBe(120_000);
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

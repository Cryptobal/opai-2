import { describe, expect, it } from "vitest";

import {
  type Estructura,
  gratificacionLegal,
  haberes,
  resolverEstructura,
  solapan,
} from "./estructuras";

const IMM = 529_000;
const base = (
  n: Estructura["nivel"],
  sueldoBase: number,
  desde: string,
  hasta?: string,
): Estructura => ({
  id: `${n}-${desde}`,
  nivel: n,
  sueldoBase,
  colacion: 45_000,
  movilizacion: 40_000,
  gratificacion: "legal_25",
  vigenteDesde: desde,
  vigenteHasta: hasta ?? null,
  estado: "vigente",
  items: [],
});

describe("estructuras de sueldo", () => {
  it("resuelve persona → puesto → instalación por fecha, sin cargo", () => {
    const instalacion = [
      base("instalacion", 520_000, "2025-01-01", "2025-12-31"),
      base("instalacion", 560_000, "2026-01-01"),
    ];
    const puesto = [base("puesto", 600_000, "2025-03-01")];
    const persona = [base("persona", 650_000, "2026-06-01")];
    expect(resolverEstructura("2026-02-01", { instalacion }).estructura?.sueldoBase).toBe(560_000);
    expect(resolverEstructura("2025-06-01", { instalacion }).estructura?.sueldoBase).toBe(520_000);
    expect(resolverEstructura("2026-02-01", { instalacion, puesto }).aplica).toBe("puesto");
    const r = resolverEstructura("2026-07-01", { instalacion, puesto, persona });
    expect(r.aplica).toBe("persona");
    expect(r.niveles.instalacion?.sueldoBase).toBe(560_000);
    expect(resolverEstructura("2024-01-01", { instalacion }).aplica).toBeNull();
    expect(resolverEstructura("2026-01-01", { cargo: [base("cargo", 1, "2025-01-01")] }).aplica).toBeNull();
  });
  it("ignora estructuras anuladas", () => {
    const anulada = { ...base("persona", 900_000, "2026-01-01"), estado: "anulada" as const };
    expect(resolverEstructura("2026-02-01", { persona: [anulada] }).aplica).toBeNull();
  });
  it("gratificación legal: 25 % con tope de 4,75 IMM / 12", () => {
    expect(gratificacionLegal(560_000, IMM)).toBe(140_000);
    expect(gratificacionLegal(1_500_000, IMM)).toBe(209_396);
  });
  it("haberes con bonos imponibles y no imponibles", () => {
    const e: Estructura = {
      ...base("puesto", 600_000, "2025-03-01"),
      items: [
        { tipo: "bono_fijo", nombre: "Nocturno", monto: 60_000, imponible: true },
        { tipo: "bono_porcentual", nombre: "Asistencia", porcentaje: 50_000, imponible: false },
      ],
    };
    const h = haberes(e, IMM);
    expect(h.gratificacion).toBe(150_000);
    expect(h.imponible).toBe(600_000 + 150_000 + 60_000);
    expect(h.noImponible).toBe(45_000 + 40_000 + 30_000);
    expect(h.total).toBe(h.imponible + h.noImponible);
  });
  it("detecta solapes de vigencia", () => {
    expect(solapan({ vigenteDesde: "2026-01-01" }, { vigenteDesde: "2026-06-01" })).toBe(true);
    expect(
      solapan(
        { vigenteDesde: "2025-01-01", vigenteHasta: "2025-12-31" },
        { vigenteDesde: "2026-01-01" },
      ),
    ).toBe(false);
  });
});

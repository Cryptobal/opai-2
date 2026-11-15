import { describe, expect, it } from "vitest";

import { cierraCiclo, personasACargo, type CargoJefatura, type PersonaJefatura } from "./index";

// Gerente ← Jefe de ventas ← Vendedor; Gerente ← Supervisor ← Guardia.
const cargo = (
  id: string,
  jefaturaCargoId: string | null,
  jefaturaVe: CargoJefatura["jefaturaVe"] = "asignadas",
): CargoJefatura => ({ id, jefaturaCargoId, jefaturaVe });
const cargos = [
  cargo("gerente", null),
  cargo("jefe_ventas", "gerente", "equipo"),
  cargo("vendedor", "jefe_ventas"),
  cargo("supervisor", "gerente", "equipo"),
  cargo("guardia", "supervisor", "instalaciones"),
];
const persona = (id: string, cargoId: string, extra: Partial<PersonaJefatura> = {}): PersonaJefatura => ({
  id,
  cargoId,
  jefePersonaId: null,
  instalacionId: null,
  instalacionesACargo: [],
  ...extra,
});
const personas = [
  persona("gema", "gerente"),
  persona("julia", "jefe_ventas"),
  persona("jorge", "jefe_ventas"),
  persona("vera", "vendedor", { jefePersonaId: "julia" }),
  persona("victor", "vendedor", { jefePersonaId: "jorge" }),
  persona("valeria", "vendedor"),
  persona("sara", "supervisor", { instalacionesACargo: ["i1"] }),
  persona("gabriel", "guardia", { instalacionId: "i1" }),
  persona("gloria", "guardia", { instalacionId: "i2" }),
];
const aCargo = (jefe: string) => [...personasACargo(jefe, personas, cargos)].sort();

describe("personasACargo", () => {
  it("dos jefes con el mismo cargo: cada uno ve solo a quienes tiene asignados", () => {
    expect(aCargo("julia")).toEqual(["vera"]);
    expect(aCargo("jorge")).toEqual(["victor"]);
  });
  it("el jefe del jefe ve toda su línea hacia abajo", () => {
    // Gema ve a los jefes de ventas y supervisores (equipo) y, por ellos, a su gente. Valeria no
    // tiene jefe asignado y Gloria está en una instalación que nadie tiene a cargo: nadie las tiene
    // directamente, así que suben un nivel y las ve Gema. Nadie queda invisible.
    expect(aCargo("gema")).toEqual([
      "gabriel",
      "gloria",
      "jorge",
      "julia",
      "sara",
      "valeria",
      "vera",
      "victor",
    ]);
    expect(aCargo("julia")).not.toContain("valeria");
    expect(aCargo("sara")).not.toContain("gloria");
  });
  it("por instalaciones: solo las personas de las instalaciones a su cargo", () => {
    expect(aCargo("sara")).toEqual(["gabriel"]);
  });
  it("quien no es jefatura de nadie no tiene personas a cargo, ni un jefe se ve a sí mismo", () => {
    expect(aCargo("vera")).toEqual([]);
    expect(aCargo("no-existe")).toEqual([]);
    expect(personasACargo("gema", personas, cargos).has("gema")).toBe(false);
  });
  it("un jefe asignado que no tiene el cargo de jefatura no cuenta", () => {
    const mal = [...personas, persona("vito", "vendedor", { jefePersonaId: "sara" })];
    expect(personasACargo("sara", mal, cargos).has("vito")).toBe(false);
  });
  it("tolera un ciclo en los datos sin colgarse", () => {
    const ciclo = [cargo("a", "b", "equipo"), cargo("b", "a", "equipo")];
    const gente = [persona("p1", "a"), persona("p2", "b")];
    expect([...personasACargo("p1", gente, ciclo)]).toEqual(["p2"]);
  });
});

describe("cierraCiclo", () => {
  it("detecta el ciclo directo y el indirecto", () => {
    expect(cierraCiclo(cargos, "gerente", "vendedor")).toBe(true);
    expect(cierraCiclo(cargos, "jefe_ventas", "vendedor")).toBe(true);
    expect(cierraCiclo(cargos, "vendedor", "vendedor")).toBe(true);
  });
  it("acepta una jefatura que no depende del cargo", () => {
    expect(cierraCiclo(cargos, "vendedor", "supervisor")).toBe(false);
    expect(cierraCiclo(cargos, "guardia", "gerente")).toBe(false);
  });
});

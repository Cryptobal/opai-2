import { describe, expect, it } from "vitest";

import type { Accion } from "../../scripts/importar-opai1/comun";
import { estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import { calcularPlan, type Plan } from "../../scripts/importar-opai1/plan";
import { aplicarEnMemoria, fixture } from "./memoria";

const todas = (p: Plan) => [...p.cuentas, ...p.contactos, ...p.instalaciones];
const cuenta = (p: Plan, accion: Accion) => todas(p).filter((d) => d.accion === accion).length;

describe("idempotencia del plan", () => {
  it("el mismo origen y el mismo estado dan exactamente el mismo plan", () => {
    const destino = estadoVacio();
    expect(calcularPlan(fixture(), destino)).toEqual(calcularPlan(fixture(), destino));
  });

  it("el orden de las filas de 1.0 no cambia el plan", () => {
    const datos = fixture();
    const invertido = {
      ...datos,
      accounts: [...datos.accounts].reverse(),
      contacts: [...datos.contacts].reverse(),
      installations: [...datos.installations].reverse(),
    };
    expect(calcularPlan(invertido, estadoVacio())).toEqual(calcularPlan(datos, estadoVacio()));
  });

  it("con los ids externos ya mapeados todo sale sin cambios (salvo lo no resuelto)", () => {
    const primero = calcularPlan(fixture(), estadoVacio());
    expect(cuenta(primero, "crear")).toBeGreaterThan(0);
    const cargado = aplicarEnMemoria(primero, estadoVacio());
    const segundo = calcularPlan(fixture(), cargado);
    expect(cuenta(segundo, "crear")).toBe(0);
    expect(cuenta(segundo, "actualizar")).toBe(0);
    // Los duplicados fundidos pasan a «sin cambios»; conflictos y omitidos con motivo se mantienen.
    const pendientes = (p: Plan) =>
      todas(p)
        .filter((d) => d.accion === "conflicto" || (d.accion === "omitido" && !d.fusionaCon))
        .map((d) => `${d.idOpai1}:${d.motivo}`)
        .sort();
    expect(pendientes(segundo)).toEqual(pendientes(primero));
    expect(todas(segundo).filter((d) => d.accion === "omitido" && d.fusionaCon)).toEqual([]);
    expect(segundo.propuestas).toEqual(calcularPlan(fixture(), cargado).propuestas);
    // Una tercera pasada sobre el mismo estado tampoco cambia nada.
    expect(calcularPlan(fixture(), cargado)).toEqual(segundo);
  });

  it("un cambio en 1.0 después de la carga sale como actualizar con el nombre del campo", () => {
    const cargado = aplicarEnMemoria(calcularPlan(fixture(), estadoVacio()), estadoVacio());
    const datos = fixture();
    const a6 = datos.accounts.find((a) => a.id === "acc-a6");
    if (!a6) throw new Error("fixture sin acc-a6");
    a6.name = "Delta Logística Renombrada";
    const d = calcularPlan(datos, cargado).cuentas.find((x) => x.idOpai1 === "acc-a6");
    expect(d).toMatchObject({
      accion: "conflicto",
      motivo: "conflicto_completar_vacios",
      campos: ["nombre"],
    });
  });
});

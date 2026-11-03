import { describe, expect, it } from "vitest";

import { campoVacio, completarVacios } from "../../scripts/importar-opai1/completar-vacios";
import { bloquearAplicarPorEtapas } from "../../scripts/importar-opai1/negocios-plan";
import { conciliar } from "../../scripts/importar-opai1/corrida/conciliar";
import { calcularPlan } from "../../scripts/importar-opai1/plan";
import { estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import { aplicarEnMemoria, fixture } from "./memoria";

describe("importador v2", () => {
  it("completar vacíos: no pisa valores existentes ni escribe null", () => {
    expect(campoVacio("")).toBe(true);
    const r = completarVacios(
      { nombre: "Nuevo", giro: null, rut: "1-9" },
      { nombre: "Viejo", giro: "Servicios", rut: null },
    );
    expect(r.patch).toEqual({ rut: "1-9" });
    expect(r.conflictos).toEqual(["nombre"]);
  });

  it("segunda corrida: sin crear ni actualizar tras aplicar en memoria", () => {
    const primero = calcularPlan(fixture(), estadoVacio(), { modulosActivos: ["comercial"] });
    const cargado = aplicarEnMemoria(primero, estadoVacio());
    const segundo = calcularPlan(fixture(), cargado, { modulosActivos: ["comercial"] });
    const acciones = [...segundo.cuentas, ...segundo.contactos, ...segundo.instalaciones].map(
      (d) => d.accion,
    );
    expect(acciones.filter((a) => a === "crear")).toHaveLength(0);
    expect(acciones.filter((a) => a === "actualizar")).toHaveLength(0);
  });

  it("cuenta con giro en 2.0 no cambia si 1.0 trae otro giro", () => {
    const destino = estadoVacio();
    destino.cuentas.push({
      id: "c-1",
      nombre: "Comercial Alfa SpA",
      razonSocial: "Comercial Alfa SpA",
      rut: "76111111-6",
      giro: "Ya definido",
      calle: null,
      comuna: null,
      ciudad: null,
      emailDte: null,
      estado: "prospecto",
    });
    destino.ids.push({ entidadTipo: "cuenta", idExterno: "acc-a1", entidadId: "c-1" });
    const datos = fixture();
    const a1 = datos.accounts.find((a) => a.id === "acc-a1");
    if (!a1) throw new Error("sin acc-a1");
    a1.giro = "Desde 1.0";
    const d = calcularPlan(datos, destino).cuentas.find((x) => x.idOpai1 === "acc-a1");
    expect(d?.accion).toBe("conflicto");
    expect(d?.motivo).toBe("conflicto_completar_vacios");
  });

  it("razón social vacía en 1.0 no rellena con nombre de fantasía", () => {
    const datos = fixture();
    const a6 = datos.accounts.find((a) => a.id === "acc-a6");
    if (!a6) throw new Error("sin acc-a6");
    a6.legalName = null;
    const plan = calcularPlan(datos, estadoVacio());
    expect(plan.cuentas.find((c) => c.idOpai1 === "acc-a6")?.datos?.razonSocial).toBeNull();
  });

  it("client_active mapea a cliente_activo", () => {
    const datos = fixture();
    datos.accounts[0]!.status = "client_active";
    const d = calcularPlan(datos, estadoVacio()).cuentas.find((c) => c.idOpai1 === "acc-a1");
    expect(d?.datos?.estado).toBe("cliente_activo");
  });

  it("etapas sin mapear bloquean aplicar", () => {
    expect(bloquearAplicarPorEtapas(["etapa-x"])).toBe(true);
    expect(bloquearAplicarPorEtapas([])).toBe(false);
  });

  it("conciliación cuadra conteos por entidad", () => {
    const plan = calcularPlan(fixture(), estadoVacio(), { modulosActivos: ["comercial"] });
    const c = conciliar(fixture(), plan);
    expect(c.entidades.find((e) => e.entidad === "cuenta")?.enOrigen).toBe(6);
  });
});

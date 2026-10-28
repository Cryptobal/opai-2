import { describe, expect, it } from "vitest";

import { planCuentas, resolverCuentas } from "../../scripts/importar-opai1/cuentas";
import { estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import { fixture } from "./memoria";

const por = (plan: ReturnType<typeof planCuentas>, id: string) =>
  plan.decisiones.find((d) => d.idOpai1 === id);

describe("plan de cuentas", () => {
  it("dedupe por RUT normalizado: la más antigua es canónica y la otra se funde", () => {
    const plan = planCuentas(fixture().accounts, estadoVacio());
    expect(por(plan, "acc-a1")).toMatchObject({ accion: "crear", fusionaCon: null });
    expect(por(plan, "acc-a1")?.datos?.rut).toBe("76111111-6");
    expect(por(plan, "acc-a2")).toMatchObject({
      accion: "omitido",
      motivo: "duplicado_rut",
      fusionaCon: "acc-a1",
    });
    const resolver = resolverCuentas(plan.decisiones);
    expect(resolver("acc-a2")).toEqual({ clave: "nueva:acc-a1", destinoId: null });
    expect(resolver("acc-zz")).toBeUndefined();
  });

  it("sin RUT: propone fusión por nombre canónico y nunca la aplica", () => {
    const plan = planCuentas(fixture().accounts, estadoVacio());
    expect(por(plan, "acc-a3")?.accion).toBe("crear");
    expect(por(plan, "acc-a4")?.accion).toBe("crear");
    expect(plan.propuestas).toEqual([
      {
        entidad: "cuenta",
        criterio: "nombre_canonico",
        idsOpai1: ["acc-a3", "acc-a4"],
        idsDestino: [],
      },
    ]);
  });

  it("RUT inválido se avisa y la cuenta se trata como sin RUT", () => {
    const plan = planCuentas(fixture().accounts, estadoVacio());
    expect(plan.avisos).toContainEqual({ codigo: "rut_invalido", idOpai1: "acc-a5" });
    expect(por(plan, "acc-a5")?.datos?.rut).toBeNull();
  });

  it("contra 2.0: vincula por RUT, detecta conflicto y cambios de campos", () => {
    const destino = estadoVacio();
    destino.cuentas.push(
      { id: "c-1", nombre: "Comercial Alfa SpA", razonSocial: null, rut: "76111111-6" },
      { id: "c-6", nombre: "Delta", razonSocial: null, rut: "76333333-7" },
      { id: "c-3", nombre: "Inmobiliaria BETA S.A.", razonSocial: null, rut: null },
    );
    destino.ids.push(
      { entidadTipo: "cuenta", idExterno: "acc-otra", entidadId: "c-6" },
      { entidadTipo: "cuenta", idExterno: "acc-a5", entidadId: "c-9" },
    );
    const plan = planCuentas(fixture().accounts, destino);
    expect(por(plan, "acc-a1")).toMatchObject({
      accion: "actualizar",
      motivo: "vincula_por_rut",
      destinoId: "c-1",
      campos: ["razonSocial"],
    });
    expect(por(plan, "acc-a6")).toMatchObject({ accion: "conflicto", motivo: "rut_ya_mapeado" });
    expect(por(plan, "acc-a5")).toMatchObject({
      accion: "conflicto",
      motivo: "id_externo_huerfano",
    });
    expect(plan.propuestas[0]?.idsDestino).toEqual(["c-3"]);
  });
});

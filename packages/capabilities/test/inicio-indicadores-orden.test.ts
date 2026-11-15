import { beforeEach, describe, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { contextoDePrueba } from "../src/testing";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

type Salida = { orden: string[]; editable: boolean; elegidos: string[] };

const leer = async (ctx: ReturnType<typeof contextoDePrueba>["ctx"]) => {
  const r = await executeCapability(ctx, "core.inicio.indicadores", {});
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.data as Salida;
};

describe("core.inicio.indicadores con la elección de la empresa (CAR-335 D3)", () => {
  it("quien configura ve la elección y puede cambiarla; el orden la respeta", async () => {
    const { ctx } = contextoDePrueba();
    expect((await leer(ctx)).editable).toBe(true);
    const guardado = await executeCapability(ctx, "core.config.set", {
      modulo: "core",
      clave: "inicio_indicadores",
      valor: ["tickets", "cobertura"],
    });
    expect(guardado.ok).toBe(true);
    const d = await leer(ctx);
    expect(d.elegidos).toEqual(["tickets", "cobertura"]);
    expect(d.orden.every((id) => d.elegidos.includes(id))).toBe(true);
  });

  it("sin permiso de configuración no es editable ni ve la elección completa", async () => {
    const { ctx } = contextoDePrueba({ permisos: ["core:tickets.read"] });
    const d = await leer(ctx);
    expect(d.editable).toBe(false);
    expect(d.elegidos).toEqual([]);
  });
});

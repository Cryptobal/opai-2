import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

type Fila = {
  nombre: string;
  sueldoVigente: { sueldoBase: number | null; sensible: boolean } | null;
};

describe("cargos.list con el sueldo vigente (diseño 14)", () => {
  it("muestra los montos vigentes y los oculta al rol sin permiso sensible", async () => {
    const { ctx } = contextoDePrueba();
    const c = await dato<{ id: string }>(ctx, "core.cargos.create", {
      nombre: "Administrativo",
      sueldoSensible: true,
    });
    await dato(ctx, "core.estructuras.create", {
      nivel: "cargo",
      cargoId: c.id,
      sueldoBase: 900_000,
      vigenteDesde: "2026-01-01",
    });
    await dato(ctx, "core.cargos.create", { nombre: "Conserje" });
    const owner = await dato<Fila[]>(ctx, "core.cargos.list", {});
    expect(owner.find((f) => f.nombre === "Administrativo")?.sueldoVigente).toMatchObject({
      sueldoBase: 900_000,
      sensible: false,
    });
    expect(owner.find((f) => f.nombre === "Conserje")?.sueldoVigente).toBeNull();

    const sinPermiso = { ...ctx, autorizar: (x: string) => x !== "core:estructuras.read_sensible" };
    const g = await dato<Fila[]>(sinPermiso, "core.cargos.list", {});
    expect(g.find((f) => f.nombre === "Administrativo")?.sueldoVigente).toMatchObject({
      sueldoBase: null,
      sensible: true,
    });
  });

  it("puestos.list por cargo incluye el nombre de la instalación", async () => {
    const { ctx } = contextoDePrueba();
    const cargo = await dato<{ id: string }>(ctx, "core.cargos.create", { nombre: "Guardia" });
    const cuenta = await dato<{ id: string }>(ctx, "core.cuentas.create", {
      nombre: "Logística Andina",
    });
    const i = await dato<{ id: string }>(ctx, "core.instalaciones.create", {
      cuentaId: cuenta.id,
      nombre: "CD Pudahuel",
    });
    await dato(ctx, "core.puestos.create", {
      instalacionId: i.id,
      cargoId: cargo.id,
      nombre: "Guardia noche",
      diasTrabajo: 4,
      diasDescanso: 4,
      horaInicio: "20:00",
      horaFin: "08:00",
      dotacion: 2,
    });
    const p = await dato<{ instalacion: string }[]>(ctx, "core.puestos.list", {
      cargoId: cargo.id,
    });
    expect(p).toEqual([
      expect.objectContaining({ nombre: "Guardia noche", instalacion: "CD Pudahuel" }),
    ]);
  });
});

import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

type Fila = {
  nombre: string;
  sueldoVigente: { sueldoBase: number | null; sensible: boolean } | null;
};

describe("cargos.list sin montos (07b, pantalla 18)", () => {
  it("no revela montos ni consulta estructuras, con o sin permiso sensible", async () => {
    const { ctx, eventos } = contextoDePrueba();
    await dato(ctx, "core.cargos.create", { nombre: "Administrativo", sueldoSensible: true });
    for (const autorizar of [
      ctx.autorizar,
      (p: string) => p !== "core:estructuras.read_sensible",
    ]) {
      const lista = await dato<Fila[]>({ ...ctx, autorizar }, "core.cargos.list", {});
      expect(lista[0]).toMatchObject({ nombre: "Administrativo" });
      expect(lista[0]).not.toHaveProperty("sueldoVigente");
    }
    expect(eventos.filter((e) => e.capability === "core.estructuras.read_sensible")).toEqual([]);
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
    });
    const p = await dato<{ instalacion: string }[]>(ctx, "core.puestos.list", {
      cargoId: cargo.id,
    });
    expect(p).toEqual([
      expect.objectContaining({ nombre: "Guardia noche", instalacion: "CD Pudahuel" }),
    ]);
  });
});

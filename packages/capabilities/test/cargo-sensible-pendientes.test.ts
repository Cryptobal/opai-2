import { beforeEach, describe, expect, it } from "vitest";
import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

describe("permisos de sueldos sensibles", () => {
  it("permite reenviar el valor actual, rechaza cambios y creación sensible y audita sin montos", async () => {
    const { ctx, eventos } = contextoDePrueba();
    const sin = { ...ctx, autorizar: (p: string) => p !== "core:estructuras.read_sensible" };
    const { id } = await dato<{ id: string }>(ctx, "core.cargos.create", {
      nombre: "Cargo",
      sueldoSensible: true,
    });
    await dato(sin, "core.cargos.update", { id, nombre: "Cargo editado", sueldoSensible: true });
    expect(await codigo(sin, "core.cargos.update", { id, sueldoSensible: false })).toBe(
      "FORBIDDEN",
    );
    expect(await codigo(sin, "core.cargos.create", { nombre: "Otro", sueldoSensible: true })).toBe(
      "FORBIDDEN",
    );
    const rechazos = eventos.filter((e) => e.capability === "core.sueldo.rechazo_sensible");
    expect(rechazos).toHaveLength(2);
    expect(rechazos[0]).toMatchObject({ tenantId: ctx.tenantId, actor: ctx.actor, payload: {} });
  });
  it("rechaza versiones de cargo sensible sin permiso, incluso en vista previa", async () => {
    const { ctx, eventos } = contextoDePrueba();
    const { id } = await dato<{ id: string }>(ctx, "core.cargos.create", {
      nombre: "Cargo",
      sueldoSensible: true,
    });
    const sin = { ...ctx, autorizar: (p: string) => p !== "core:estructuras.read_sensible" };
    const input = { nivel: "cargo", cargoId: id, sueldoBase: 100, vigenteDesde: "2026-01-01" };
    expect(await codigo(sin, "core.estructuras.create", input, { dryRun: true })).toBe("FORBIDDEN");
    expect(eventos.some((e) => e.capability === "core.sueldo.rechazo_sensible")).toBe(true);
  });
});

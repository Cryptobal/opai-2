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
  it.each(["puesto", "persona"] as const)(
    "rechaza reemplazar bonos ocultos en %s y audita el rechazo",
    async (nivel) => {
      const { ctx, eventos } = contextoDePrueba();
      const cuenta = await dato<{ id: string }>(ctx, "core.cuentas.create", { nombre: "Cuenta" });
      const instalacion = await dato<{ id: string }>(ctx, "core.instalaciones.create", {
        cuentaId: cuenta.id,
        nombre: "Planta",
      });
      const cargo = await dato<{ id: string }>(ctx, "core.cargos.create", { nombre: "Cargo" });
      const puesto = await dato<{ id: string }>(ctx, "core.puestos.create", {
        instalacionId: instalacion.id,
        cargoId: cargo.id,
        nombre: "Puesto",
        diasTrabajo: 4,
        diasDescanso: 4,
        horaInicio: "08:00",
        horaFin: "20:00",
      });
      const persona = await dato<{ id: string }>(ctx, "core.personas.create", {
        nombres: "Ana",
        apellidos: "Ejemplo",
        rut: "12.345.678-5",
      });
      const entrada = {
        nivel,
        ...(nivel === "puesto"
          ? { puestoId: puesto.id }
          : { personaId: persona.id, motivo: "Prueba" }),
        sueldoBase: 600000,
        colacion: 0,
        movilizacion: 0,
        gratificacion: "ninguna",
        vigenteDesde: "2026-01-01",
        items: [
          { nombre: "Turno", tipo: "bono_fijo", monto: 10000, imponible: true, tributable: true },
        ],
      };
      await dato(ctx, "core.estructuras.create", entrada);
      const sin = { ...ctx, autorizar: (p: string) => p !== "core:estructuras.read_sensible" };
      expect(
        await codigo(sin, "core.estructuras.create", {
          ...entrada,
          items: [],
          vigenteDesde: "2026-02-01",
        }),
      ).toBe("FORBIDDEN");
      const rechazos = eventos.filter((e) => e.capability === "core.sueldo.rechazo_sensible");
      expect(rechazos).toHaveLength(1);
      expect(rechazos[0]).toMatchObject({ tenantId: ctx.tenantId, actor: ctx.actor, payload: {} });
      const versiones = await dato<{ items: { monto: number }[] }[]>(ctx, "core.estructuras.list", {
        nivel,
        refId: nivel === "puesto" ? puesto.id : persona.id,
      });
      expect(versiones).toHaveLength(1);
      expect(versiones[0]?.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ monto: 10000 })]),
      );
    },
  );
  it("si falla la auditoría, no persiste la versión", async () => {
    const { ctx, tabla } = contextoDePrueba();
    const cargo = await dato<{ id: string }>(ctx, "core.cargos.create", { nombre: "Cargo" });
    ctx.auditoria.registrar = async () => {
      throw new Error("auditoría caída");
    };
    expect(
      await codigo(ctx, "core.estructuras.create", {
        nivel: "cargo",
        cargoId: cargo.id,
        sueldoBase: 100,
        vigenteDesde: "2026-01-01",
      }),
    ).toBe("INTERNAL");
    expect(tabla("estructuraSueldo")).toHaveLength(0);
  });
});

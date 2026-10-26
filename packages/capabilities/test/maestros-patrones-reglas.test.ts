// Brief 11 · Puestos PR 1 (revisión 5658390255): reglas de los catálogos del puesto. La dotación ya
// no se escribe por API/MCP, un patrón en uso no cambia su forma, los semanales son coherentes y
// desactivar un catálogo no bloquea editar los puestos que ya lo usan.
import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

async function base() {
  const p = contextoDePrueba();
  const cuenta = await dato<{ id: string }>(p.ctx, "core.cuentas.create", { nombre: "Sur" });
  const cargo = await dato<{ id: string }>(p.ctx, "core.cargos.create", { nombre: "Guardia" });
  const inst = await dato<{ id: string }>(p.ctx, "core.instalaciones.create", {
    cuentaId: cuenta.id,
    nombre: "Torre",
  });
  const patron = await dato<{ id: string }>(p.ctx, "core.patrones.create", {
    nombre: "4×4",
    diasTrabajo: 4,
    diasDescanso: 4,
  });
  const funcion = await dato<{ id: string }>(p.ctx, "core.funciones.create", { nombre: "Guardia" });
  const puesto = (extra: Record<string, unknown> = {}) =>
    dato<{ id: string; dotacion: number; nombre: string }>(p.ctx, "core.puestos.create", {
      instalacionId: inst.id,
      cargoId: cargo.id,
      nombre: "Día",
      diasTrabajo: 4,
      diasDescanso: 4,
      horaInicio: "08:00",
      horaFin: "20:00",
      ...extra,
    });
  return { ...p, patronId: patron.id, funcionId: funcion.id, puesto };
}

describe("reglas de patrones, funciones y dotación", () => {
  it("la dotación queda en 1 aunque API o MCP envíen otra", async () => {
    const { ctx, puesto, tabla } = await base();
    const p = await puesto({ dotacion: 8 });
    expect(p.dotacion).toBe(1);
    await dato(ctx, "core.puestos.update", { id: p.id, dotacion: 5 });
    expect(tabla("puesto")[0]?.["dotacion"]).toBe(1);
  });

  it("un patrón con puestos no cambia su ciclo, pero sí su nombre", async () => {
    const { ctx, puesto, patronId } = await base();
    await puesto({ patronId });
    expect(await codigo(ctx, "core.patrones.update", { id: patronId, diasTrabajo: 5 })).toBe(
      "UNPROCESSABLE",
    );
    expect(
      await codigo(ctx, "core.patrones.update", { id: patronId, diasTrabajo: 5 }, { dryRun: true }),
    ).toBe("UNPROCESSABLE");
    const r = await dato<{ nombre: string; diasTrabajo: number }>(ctx, "core.patrones.update", {
      id: patronId,
      nombre: "4×4 día",
      diasTrabajo: 4,
    });
    expect(r).toMatchObject({ nombre: "4×4 día", diasTrabajo: 4 });
  });

  it("los semanales derivan el ciclo de los días marcados y rechazan contradicciones", async () => {
    const { ctx } = await base();
    const lav = await dato<{ diasTrabajo: number; diasDescanso: number; diasSemana: number[] }>(
      ctx,
      "core.patrones.create",
      { nombre: "L a V", clase: "semanal", diasSemana: [5, 4, 3, 2, 1] },
    );
    expect(lav).toMatchObject({ diasTrabajo: 5, diasDescanso: 2, diasSemana: [1, 2, 3, 4, 5] });
    const malos = [
      { nombre: "5×2 raro", clase: "semanal", diasTrabajo: 5, diasDescanso: 2, diasSemana: [1] },
      { nombre: "Repetido", clase: "semanal", diasSemana: [1, 1, 2] },
      { nombre: "Siete", clase: "semanal", diasSemana: [1, 2, 3, 4, 5, 6, 7] },
      { nombre: "Cíclico con días", clase: "ciclico", diasTrabajo: 4, diasDescanso: 4, diasSemana: [1] },
      { nombre: "Cíclico sin ciclo", clase: "ciclico" },
    ];
    for (const m of malos) expect(await codigo(ctx, "core.patrones.create", m)).toBe("UNPROCESSABLE");
  });

  it("desactivar la función o el patrón no bloquea editar el puesto, pero sí elegirlos", async () => {
    const { ctx, puesto, patronId, funcionId } = await base();
    const p = await puesto({ patronId, funcionId });
    await dato(ctx, "core.patrones.set_activo", { id: patronId, activo: false });
    await dato(ctx, "core.funciones.set_activo", { id: funcionId, activo: false });
    const r = await dato<{ nombre: string }>(ctx, "core.puestos.update", {
      id: p.id,
      nombre: "Día norte",
      patronId,
      funcionId,
    });
    expect(r.nombre).toBe("Día norte");
    const otro = await puesto({ nombre: "Noche" });
    expect(await codigo(ctx, "core.puestos.update", { id: otro.id, patronId })).toBe("UNPROCESSABLE");
    expect(await codigo(ctx, "core.puestos.update", { id: otro.id, funcionId })).toBe("UNPROCESSABLE");
  });
});

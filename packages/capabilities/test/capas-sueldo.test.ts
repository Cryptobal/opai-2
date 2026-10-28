import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);
const completa = {
  sueldoBase: 600000,
  colacion: 0,
  movilizacion: 0,
  gratificacion: "ninguna",
  vigenteDesde: "2026-01-01",
};
async function preparar() {
  const p = contextoDePrueba();
  const cuenta = await dato<{ id: string }>(p.ctx, "core.cuentas.create", { nombre: "Ejemplo" });
  const i = await dato<{ id: string }>(p.ctx, "core.instalaciones.create", {
    cuentaId: cuenta.id,
    nombre: "Ejemplo",
  });
  const persona = await dato<{ id: string }>(p.ctx, "core.personas.create", {
    nombres: "Ana",
    apellidos: "Ejemplo",
    rut: "12.345.678-5",
  });
  return { ...p, instalacionId: i.id, personaId: persona.id };
}
describe("07b: capas por la misma capacidad UI/API/MCP", () => {
  it("audita la lectura de versiones por lote con todos los ids, sin copiar montos", async () => {
    const { ctx, eventos, instalacionId } = await preparar();
    const a = await dato<{ id: string }>(ctx, "core.estructuras.create", {
      ...completa,
      nivel: "instalacion",
      instalacionId,
    });
    const b = await dato<{ id: string }>(ctx, "core.estructuras.create", {
      ...completa,
      nivel: "instalacion",
      instalacionId,
      vigenteDesde: "2026-02-01",
    });
    eventos.splice(0);
    await dato(ctx, "core.estructuras.list", { nivel: "instalacion", refId: instalacionId });
    const lecturas = eventos.filter((e) => e.capability === "core.estructuras.read_sensible");
    expect(lecturas).toHaveLength(1);
    expect(lecturas[0]?.payload).toMatchObject({
      estructuras: expect.arrayContaining([
        expect.objectContaining({ id: a.id }),
        expect.objectContaining({ id: b.id }),
      ]),
    });
    expect(JSON.stringify(lecturas[0]?.payload)).not.toContain("sueldoBase");
  });
  it("preview incluye modalidad, bonos y cambios de imponibilidad sin persistir", async () => {
    const { ctx, instalacionId } = await preparar();
    const bono = {
      nombre: "Turno",
      tipo: "bono_fijo",
      monto: 10000,
      imponible: true,
      tributable: true,
    };
    await dato(ctx, "core.estructuras.create", {
      ...completa,
      nivel: "instalacion",
      instalacionId,
      items: [bono],
    });
    const r = await dato<{
      impacto: { diferencias: { concepto: string; antes: unknown; despues: unknown }[] };
    }>(
      ctx,
      "core.estructuras.create",
      {
        ...completa,
        nivel: "instalacion",
        instalacionId,
        vigenteDesde: "2026-02-01",
        gratificacion: "legal_25",
        items: [{ ...bono, imponible: false }],
      },
      { dryRun: true },
    );
    expect(r.impacto.diferencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          concepto: "Gratificación (modalidad)",
          antes: "ninguna",
          despues: "legal_25",
        }),
        expect.objectContaining({ concepto: "Bono Turno: imponible", antes: "Sí", despues: "No" }),
      ]),
    );
    expect(await ctx.db.estructuraSueldo.count()).toBe(1);
    expect(
      await codigo(ctx, "core.estructuras.create", {
        ...completa,
        nivel: "instalacion",
        instalacionId,
        vigenteDesde: "2026-02-01",
        items: [{ ...bono, monto: null }],
      }),
    ).toBe("UNPROCESSABLE");
  });
  it("dryRun calcula impacto sin escribir, la versión es idempotente y emite evento", async () => {
    const { ctx, eventos, instalacionId } = await preparar();
    const db = ctx.db;
    const input = { ...completa, nivel: "instalacion", instalacionId };
    const preview = await dato(ctx, "core.estructuras.create", input, { dryRun: true });
    expect(preview).toMatchObject({
      id: "",
      impacto: { borradores: 0, puestos: 0, personasRut: 0 },
    });
    expect(await db.estructuraSueldo.count()).toBe(0);
    const a = await dato<{ id: string }>(ctx, "core.estructuras.create", input, {
      idempotencyKey: "capa-1",
    });
    const b = await dato<{ id: string }>(ctx, "core.estructuras.create", input, {
      idempotencyKey: "capa-1",
    });
    expect(b.id).toBe(a.id);
    expect(await db.estructuraSueldo.count()).toBe(1);
    expect(eventos.some((e) => e.capability === "core.estructuras.create")).toBe(true);
    expect(await db.evento.count({ where: { tipo: "core.estructura.creada" } })).toBe(1);
  });
  it("resuelve solo parámetros explícitos y RUT gana completo sin mezclar", async () => {
    const { ctx, instalacionId, personaId } = await preparar();
    await dato(ctx, "core.estructuras.create", {
      ...completa,
      nivel: "instalacion",
      instalacionId,
    });
    expect(await dato(ctx, "core.estructuras.efectiva", { personaId })).toMatchObject({
      capa: null,
      estado: "sin_capa",
      haberes: null,
    });
    expect(
      await dato(ctx, "core.estructuras.efectiva", { personaId, instalacionId }),
    ).toMatchObject({ capa: "instalacion", estado: "completa" });
    await dato(ctx, "core.estructuras.create", {
      ...completa,
      nivel: "persona",
      personaId,
      sueldoBase: 700000,
      motivo: "Acuerdo individual",
    });
    const r = await dato(ctx, "core.estructuras.efectiva", { personaId, instalacionId });
    expect(r).toMatchObject({ capa: "persona", estructura: { sueldoBase: 700000, colacion: 0 } });
  });
  it("un concepto histórico nulo queda incompleto y no genera haberes falsos", async () => {
    const { ctx, instalacionId, personaId } = await preparar();
    const db = ctx.db;
    await dato(ctx, "core.estructuras.create", {
      ...completa,
      nivel: "instalacion",
      instalacionId,
    });
    await db.estructuraSueldo.create({
      data: {
        ...completa,
        nivel: "persona",
        personaId,
        colacion: null,
        vigenteDesde: new Date("2026-01-01"),
        estado: "vigente",
        tenantId: ctx.tenantId,
      },
    });
    expect(
      await dato(ctx, "core.estructuras.efectiva", { personaId, instalacionId, imm: 529000 }),
    ).toMatchObject({
      capa: "persona",
      estado: "incompleta",
      conceptosFaltantes: ["colacion"],
      estructura: { colacion: null },
      haberes: null,
    });
  });
  it("rechaza capas nuevas incompletas y RUT sin motivo", async () => {
    const { ctx, instalacionId, personaId } = await preparar();
    expect(
      await codigo(ctx, "core.estructuras.create", {
        ...completa,
        nivel: "instalacion",
        instalacionId,
        colacion: null,
      }),
    ).toBe("UNPROCESSABLE");
    expect(
      await codigo(ctx, "core.estructuras.create", { ...completa, nivel: "persona", personaId }),
    ).toBe("UNPROCESSABLE");
  });
  it("otro rol no escribe y los montos se ocultan aunque la instalación no sea sensible", async () => {
    const { ctx, instalacionId, personaId } = await preparar();
    await dato(ctx, "core.estructuras.create", {
      ...completa,
      nivel: "instalacion",
      instalacionId,
    });
    const delegado = { ...ctx, rol: "gerente" as const, autorizar: () => true };
    expect(
      await codigo(delegado, "core.estructuras.create", {
        ...completa,
        nivel: "instalacion",
        instalacionId,
      }),
    ).toBe("FORBIDDEN");
    const viewer = {
      ...ctx,
      rol: "viewer" as const,
      autorizar: (p: string) => p === "core:estructuras.read",
    };
    expect(
      await codigo(viewer, "core.estructuras.create", {
        ...completa,
        nivel: "instalacion",
        instalacionId,
      }),
    ).toBe("FORBIDDEN");
    expect(
      await dato(viewer, "core.estructuras.efectiva", { personaId, instalacionId }),
    ).toMatchObject({
      capa: "instalacion",
      estructura: { sueldoBase: null, sensible: true },
      haberes: null,
    });
  });
  it("el alcance acota instalación en get, list, create y anular sin enumeración", async () => {
    const { ctx, instalacionId } = await preparar();
    const e = await dato<{ id: string }>(ctx, "core.estructuras.create", {
      ...completa,
      nivel: "instalacion",
      instalacionId,
    });
    const acotado = { ...ctx, alcance: { instalaciones: [] } };
    expect(await codigo(acotado, "core.estructuras.get", { id: e.id })).toBe("NOT_FOUND");
    expect(
      await dato(acotado, "core.estructuras.list", { nivel: "instalacion", refId: instalacionId }),
    ).toEqual([]);
    expect(
      await codigo(acotado, "core.estructuras.create", {
        ...completa,
        nivel: "instalacion",
        instalacionId,
      }),
    ).toBe("NOT_FOUND");
    expect(
      await codigo(acotado, "core.estructuras.anular", { id: e.id, motivo: "Intento ajeno" }),
    ).toBe("NOT_FOUND");
  });
});

describe("validación de montos", () => {
  it.each([-500, 100_000_001])("rechaza sueldo base %s sin escribir", async (sueldoBase) => {
    const { ctx, instalacionId } = await preparar();
    expect(
      await codigo(ctx, "core.estructuras.create", {
        ...completa,
        nivel: "instalacion",
        instalacionId,
        sueldoBase,
      }),
    ).toBe("INVALID_INPUT");
    expect(await ctx.db.estructuraSueldo.count()).toBe(0);
  });
});

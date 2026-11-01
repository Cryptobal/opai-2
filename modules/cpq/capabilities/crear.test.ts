import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { anioEnZona } from "../domain";
import {
  ACTIVOS,
  GESTOR,
  NEGOCIO_1,
  NEGOCIO_2,
  NEGOCIO_AJENO,
  NEGOCIO_CERRADO,
  semilla,
} from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => {
  registrarCapacidades(capacidades);
});

const crear = (ctx: Parameters<typeof executeCapability>[0], input: Record<string, unknown>) =>
  executeCapability(ctx, "cpq.cotizaciones.create", input);
const anio = anioEnZona(new Date());

describe("cpq.cotizaciones.create", () => {
  it("crea la cotización con su código, la versión 1 en borrador, vigente y el evento", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    const r = await crear(ctx, { negocioId: NEGOCIO_1, titulo: "Guardias planta norte" });
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) throw new Error("unreachable");
    const d = r.data as { id: string; codigo: string; versionId: string; vigente: boolean };
    expect(d.codigo).toBe(`CPQ-${anio}-001`);
    expect(d.vigente).toBe(true);
    const c = await ctx.db.cpqCotizacion.findFirst({ where: { id: d.id } });
    expect(c).toMatchObject({ negocioId: NEGOCIO_1, creadoPorId: USUARIO_DE_PRUEBA.id });
    const v = await ctx.db.cpqVersion.findFirst({ where: { id: d.versionId } });
    expect(v).toMatchObject({
      numero: 1,
      estado: "borrador",
      moneda: "CLP",
      ventaMensualClp: null,
    });
    const ev = await ctx.db.evento.findMany({ where: { tipo: "cpq.cotizacion.creada" } });
    expect(ev).toHaveLength(1);
  });

  it("el correlativo avanza por tenant y año; la segunda del negocio no es vigente", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    await crear(ctx, { negocioId: NEGOCIO_1, titulo: "Primera cotización" });
    const r2 = await crear(ctx, { negocioId: NEGOCIO_1, titulo: "Opción B" });
    const r3 = await crear(ctx, { negocioId: NEGOCIO_2, titulo: "Otro negocio" });
    expect(r2).toMatchObject({ ok: true, data: { codigo: `CPQ-${anio}-002`, vigente: false } });
    expect(r3).toMatchObject({ ok: true, data: { codigo: `CPQ-${anio}-003`, vigente: true } });
  });

  it("dry_run muestra el código que tendría y no escribe nada", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    await crear(ctx, { negocioId: NEGOCIO_1, titulo: "Primera cotización" });
    const r = await executeCapability(
      ctx,
      "cpq.cotizaciones.create",
      { negocioId: NEGOCIO_2, titulo: "Solo vista previa" },
      { dryRun: true },
    );
    expect(r).toMatchObject({ ok: true, data: { codigo: `CPQ-${anio}-002` } });
    expect(await ctx.db.cpqCotizacion.findMany({})).toHaveLength(1);
    expect((await ctx.db.cpqCorrelativo.findFirst({}))?.ultimo).toBe(1);
  });

  it("no cotiza un negocio cerrado ni uno que no existe (NOT_FOUND sin revelar)", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    expect(
      await crear(ctx, { negocioId: NEGOCIO_CERRADO, titulo: "Negocio ya ganado" }),
    ).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await crear(ctx, { negocioId: NEGOCIO_AJENO, titulo: "De otra empresa" })).toMatchObject(
      {
        ok: false,
        error: { code: "NOT_FOUND" },
      },
    );
    expect(await ctx.db.cpqCotizacion.findMany({})).toHaveLength(0);
  });

  it("una alternativa debe ser del mismo negocio y no queda vigente", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    const base = await crear(ctx, { negocioId: NEGOCIO_1, titulo: "Cotización base" });
    if (!base.ok) throw new Error("unreachable");
    const baseId = (base.data as { id: string }).id;
    expect(
      await crear(ctx, {
        negocioId: NEGOCIO_2,
        titulo: "Alternativa cruzada",
        alternativaDeId: baseId,
      }),
    ).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(
      await crear(ctx, { negocioId: NEGOCIO_1, titulo: "Opción B", alternativaDeId: baseId }),
    ).toMatchObject({ ok: true, data: { vigente: false } });
  });

  it("rechaza una validez en el pasado y títulos demasiado cortos", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    expect(
      await crear(ctx, {
        negocioId: NEGOCIO_1,
        titulo: "Con validez vencida",
        validaHasta: "2020-01-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await crear(ctx, { negocioId: NEGOCIO_1, titulo: "x" })).toMatchObject({ ok: false });
  });

  it("exige cpq:cotizaciones.manage y el módulo activo", async () => {
    const sinPermiso = contextoDePrueba({
      semilla: semilla(),
      modulosActivos: ACTIVOS,
      permisos: ["cpq:cotizaciones.read"],
    });
    expect(
      await crear(sinPermiso.ctx, { negocioId: NEGOCIO_1, titulo: "Sin permiso" }),
    ).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    const sinModulo = contextoDePrueba({
      semilla: semilla(),
      modulosActivos: ["comercial"],
      permisos: GESTOR,
    });
    expect(
      await crear(sinModulo.ctx, { negocioId: NEGOCIO_1, titulo: "Módulo apagado" }),
    ).toMatchObject({ ok: false });
  });

  it("deja la escritura real en la auditoría", async () => {
    const { ctx, eventos } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    await crear(ctx, { negocioId: NEGOCIO_1, titulo: "Guardias planta norte" });
    expect(eventos.some((e) => e.capability === "cpq.cotizaciones.create")).toBe(true);
  });
});

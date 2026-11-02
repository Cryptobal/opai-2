import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ACTIVOS, FILA_EGR, FILA_ING, S0, S1, S2, semilla } from "./fixtures";
import { aFecha } from "./util";
import { capacidades } from "./index";

beforeAll(() => registrarCapacidades(capacidades));
const nuevo = (extra: Record<string, unknown[]> = {}, permisos?: string[]) =>
  contextoDePrueba({
    semilla: { ...semilla(), ...extra },
    modulosActivos: ACTIVOS,
    ...(permisos ? { permisos } : {}),
  });

describe("finanzas.planilla.obtener", () => {
  it("acumula el saldo desde los ajustes y marca la semana bajo el umbral", async () => {
    const { ctx } = nuevo();
    const r = await executeCapability(ctx, "finanzas.planilla.obtener", { semanas: 3 });
    if (!r.ok) throw new Error(JSON.stringify(r));
    const sem = (
      r.data as { semanas: { semana: string; saldoFinal: number; tono: string | null }[] }
    ).semanas;
    expect(sem.map((s) => s.saldoFinal)).toEqual([800, 1300, 1100]);
    expect(sem.map((s) => s.tono)).toEqual([null, null, null]);
  });
});

describe("finanzas.flujo.celdas", () => {
  it("fijar: crea, rechaza lo comprometido y semanas selladas, y el dry_run no escribe", async () => {
    const { ctx } = nuevo();
    const ok = await executeCapability(ctx, "finanzas.celdas.fijar", {
      filaId: FILA_ING,
      semana: S2,
      monto: 700,
    });
    expect(ok).toMatchObject({ ok: true });
    const choque = await executeCapability(ctx, "finanzas.celdas.fijar", {
      filaId: FILA_ING,
      semana: S1,
      monto: 1,
    });
    expect(choque).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const antes = (await ctx.db.flujoCelda.findMany({})).length;
    await executeCapability(
      ctx,
      "finanzas.celdas.fijar",
      { filaId: FILA_ING, semana: "2026-11-16", monto: 5 },
      { dryRun: true },
    );
    expect(await ctx.db.flujoCelda.findMany({})).toHaveLength(antes);
    const lunesMalo = await executeCapability(ctx, "finanzas.celdas.fijar", {
      filaId: FILA_ING,
      semana: "2026-11-10",
      monto: 5,
    });
    expect(lunesMalo).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });

  it("mover: vista previa con saldos, luego escritura real que cambia la semana", async () => {
    const { ctx } = nuevo();
    const entrada = { filaId: FILA_ING, semanas: [S0], por: 2 };
    const vp = await executeCapability(ctx, "finanzas.celdas.mover", entrada, { dryRun: true });
    expect(vp).toMatchObject({ ok: true });
    expect(
      (await ctx.db.flujoCelda.findMany({ where: { filaId: FILA_ING } }))
        .map((c) => c.monto)
        .sort(),
    ).toEqual([1000, 500]);
    const r = await executeCapability(ctx, "finanzas.celdas.mover", entrada);
    expect(r).toMatchObject({ ok: true });
    const celdas = await ctx.db.flujoCelda.findMany({ where: { filaId: FILA_ING } });
    expect(celdas.some((c) => c.semana.toISOString().startsWith(S2) && c.monto === 1000)).toBe(
      true,
    );
  });

  it("mover no toca lo comprometido", async () => {
    const { ctx } = nuevo();
    const r = await executeCapability(ctx, "finanzas.celdas.mover", {
      filaId: FILA_ING,
      semanas: [S1],
      por: 1,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("cumplir pasa la celda a real y exige estar en plan", async () => {
    const { ctx } = nuevo();
    const celda = (
      await ctx.db.flujoCelda.findMany({ where: { filaId: FILA_ING, capa: "plan" } })
    )[0]!;
    const r = await executeCapability(ctx, "finanzas.celdas.cumplir", { id: celda.id, monto: 900 });
    expect(r).toMatchObject({ ok: true, data: { capa: "real", monto: 900 } });
    const otra = await executeCapability(ctx, "finanzas.celdas.cumplir", { id: celda.id });
    expect(otra).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("deniega escribir sin el permiso de gestionar", async () => {
    const { ctx } = nuevo({}, ["finanzas:flujo.ver"]);
    const r = await executeCapability(ctx, "finanzas.celdas.fijar", {
      filaId: FILA_ING,
      semana: S2,
      monto: 1,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});

describe("cierre semanal", () => {
  it("exige motivo sobre la tolerancia, sella, bloquea cambios y reabre con motivo", async () => {
    const { ctx } = nuevo();
    const sinMotivo = await executeCapability(ctx, "finanzas.cierres.sellar", {
      semana: S0,
      saldoBanco: 5000,
    });
    expect(sinMotivo).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const ok = await executeCapability(ctx, "finanzas.cierres.sellar", {
      semana: S0,
      saldoBanco: 800,
    });
    expect(ok).toMatchObject({
      ok: true,
      data: { saldoSugerido: 800, diferencia: 0, sellada: true },
    });
    const bloqueada = await executeCapability(ctx, "finanzas.celdas.fijar", {
      filaId: FILA_ING,
      semana: S0,
      monto: 1,
    });
    expect(bloqueada).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const doble = await executeCapability(ctx, "finanzas.cierres.sellar", {
      semana: S0,
      saldoBanco: 800,
    });
    expect(doble).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    const re = await executeCapability(ctx, "finanzas.cierres.reabrir", {
      semana: S0,
      motivo: "Corrección de banco",
    });
    expect(re).toMatchObject({ ok: true, data: { sellada: false } });
  });
});

describe("finanzas.flujo.aviso", () => {
  it("planilla.obtener no inserta avisos emitidos", async () => {
    const { ctx } = nuevo({
      flujoAjustes: [
        {
          ...semilla().flujoAjustes[0]!,
          avisoActivo: true,
          avisoUmbral: 10_000,
        },
      ],
    });
    const antes = await ctx.db.flujoAvisoEmitido.findMany({});
    await executeCapability(ctx, "finanzas.planilla.obtener", { semanas: 3 });
    await executeCapability(ctx, "finanzas.planilla.obtener", { semanas: 3 });
    expect(await ctx.db.flujoAvisoEmitido.findMany({})).toHaveLength(antes.length);
  });

  it("escrituras seguidas no duplican el aviso de una misma semana", async () => {
    const { ctx } = nuevo({
      flujoAjustes: [
        {
          ...semilla().flujoAjustes[0]!,
          avisoActivo: true,
          avisoUmbral: 50_000,
        },
      ],
    });
    await executeCapability(ctx, "finanzas.celdas.fijar", {
      filaId: FILA_EGR,
      semana: S2,
      monto: 80_000,
    });
    await executeCapability(ctx, "finanzas.celdas.fijar", {
      filaId: FILA_EGR,
      semana: S2,
      monto: 85_000,
    });
    expect(
      await ctx.db.flujoAvisoEmitido.findMany({ where: { semana: aFecha(S2) } }),
    ).toHaveLength(1);
  });

  it("dos escrituras concurrentes terminan sin error", async () => {
    const { ctx } = nuevo({
      flujoAjustes: [
        {
          ...semilla().flujoAjustes[0]!,
          avisoActivo: true,
          avisoUmbral: 50_000,
        },
      ],
    });
    const [a, b] = await Promise.all([
      executeCapability(ctx, "finanzas.celdas.fijar", { filaId: FILA_EGR, semana: S2, monto: 80_000 }),
      executeCapability(ctx, "finanzas.celdas.fijar", { filaId: FILA_EGR, semana: S2, monto: 85_000 }),
    ]);
    expect(a).toMatchObject({ ok: true });
    expect(b).toMatchObject({ ok: true });
  });
});

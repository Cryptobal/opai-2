import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ACTIVOS, FILA_ING, S0, semilla } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => registrarCapacidades(capacidades));

const MONTO_MAX = 2_000_000_000;
const FUERA_INT4 = 3_000_000_000;

async function planillaConDosCeldasAlTope(ctx: Parameters<typeof executeCapability>[0]) {
  const creada = await executeCapability(ctx, "finanzas.filas.crear", {
    seccion: "ingreso",
    etiqueta: "Cliente B",
    arrastre: false,
  });
  if (!creada.ok) throw new Error(JSON.stringify(creada));
  const filaExtra = (creada as { ok: true; data: { id: string } }).data.id;
  for (const filaId of [FILA_ING, filaExtra]) {
    const f = await executeCapability(ctx, "finanzas.celdas.fijar", {
      filaId,
      semana: S0,
      monto: MONTO_MAX,
    });
    expect(f).toMatchObject({ ok: true });
  }
}

/** V205-01 / CAR-139: saldo acumulado > 2.000 millones (misma capacidad que pantalla y MCP). */
describe("finanzas flujo · saldos acumulados grandes", () => {
  it("planilla.obtener sigue sin INVALID_OUTPUT con dos celdas al tope", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    await planillaConDosCeldasAlTope(ctx);
    const saldoEsperado = 100 + MONTO_MAX + MONTO_MAX - 300;
    const planilla = await executeCapability(ctx, "finanzas.planilla.obtener", { semanas: 1 });
    if (!planilla.ok) throw new Error(JSON.stringify(planilla));
    const sem = (planilla.data as { semanas: { saldoFinal: number }[] }).semanas;
    expect(sem[0]?.saldoFinal).toBe(saldoEsperado);
  });

  it("sellar rechaza saldoBanco fuera de INT4 en la entrada", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    const r = await executeCapability(ctx, "finanzas.cierres.sellar", {
      semana: S0,
      saldoBanco: FUERA_INT4,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });

  it("ajustes.actualizar rechaza saldoInicial y umbral fuera de INT4", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    expect(
      await executeCapability(ctx, "finanzas.ajustes.actualizar", { saldoInicial: FUERA_INT4 }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(
      await executeCapability(ctx, "finanzas.ajustes.actualizar", { umbral: FUERA_INT4 }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });

  it("sellar con saldo sugerido > INT4 falla igual en dryRun y en escritura real", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    await planillaConDosCeldasAlTope(ctx);
    const entrada = { semana: S0, saldoBanco: 1000 };
    const vp = await executeCapability(ctx, "finanzas.cierres.sellar", entrada, { dryRun: true });
    expect(vp).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const antes = await ctx.db.flujoCierre.count({});
    const real = await executeCapability(ctx, "finanzas.cierres.sellar", entrada);
    expect(real).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await ctx.db.flujoCierre.count({})).toBe(antes);
  });
});

import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ACTIVOS, FILA_ING, FILA_EGR, S0, semilla } from "./fixtures";
import { MONTO_FLUJO_MAX, aNumeroSeguro } from "./esquemas";
import { capacidades } from "./index";

beforeAll(() => {
  registrarCapacidades(capacidades);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
});

const TOPE_CELDA = MONTO_FLUJO_MAX;
const SALDO_GRANDE = 3_000_000_000_000;
const RECHAZO_10_12 = 1_000_000_000_000;

describe("finanzas flujo · BIGINT (CAR-139 §1)", () => {
  it("aNumeroSeguro rechaza valores fuera de MAX_SAFE_INTEGER", () => {
    expect(() => aNumeroSeguro(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow();
  });

  it("fijar acepta una celda al tope MONTO_FLUJO_MAX", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    const r = await executeCapability(ctx, "finanzas.celdas.fijar", {
      filaId: FILA_EGR,
      semana: S0,
      monto: TOPE_CELDA,
    });
    expect(r).toMatchObject({ ok: true, data: { monto: TOPE_CELDA } });
  });

  it("fijar rechaza monto 10^12 (supera MONTO_FLUJO_MAX)", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    const r = await executeCapability(ctx, "finanzas.celdas.fijar", {
      filaId: FILA_ING,
      semana: S0,
      monto: RECHAZO_10_12,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });

  it("planilla.obtener acumula saldo > 10^12 sin INVALID_OUTPUT", async () => {
    const { ctx } = contextoDePrueba({
      semilla: {
        ...semilla(),
        flujoAjustes: [{ ...semilla().flujoAjustes[0]!, saldoInicial: SALDO_GRANDE }],
      },
      modulosActivos: ACTIVOS,
    });
    const r = await executeCapability(ctx, "finanzas.planilla.obtener", { semanas: 1 });
    if (!r.ok) throw new Error(JSON.stringify(r));
    const saldo = (r.data as { semanas: { saldoFinal: number }[] }).semanas[0]?.saldoFinal;
    expect(saldo).toBeGreaterThan(10 ** 12);
  });

  it("ajustes.actualizar persiste saldoInicial > INT4", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    const grande = 3_000_000_000;
    const aj = await executeCapability(ctx, "finanzas.ajustes.actualizar", { saldoInicial: grande });
    expect(aj).toMatchObject({ ok: true, data: { saldoInicial: grande } });
  });

  it("lectura serializa montos BIGINT de la base a number seguro", async () => {
    const { ctx } = contextoDePrueba({
      semilla: {
        ...semilla(),
        flujoCelda: [{ ...semilla().flujoCelda[0]!, monto: BigInt(5_000_000_000) }],
      },
      modulosActivos: ACTIVOS,
    });
    const planilla = await executeCapability(ctx, "finanzas.planilla.obtener", { semanas: 1 });
    if (!planilla.ok) throw new Error(JSON.stringify(planilla));
    const celdas = (planilla.data as { celdas: { monto: number }[] }).celdas;
    expect(celdas.some((c) => c.monto === 5_000_000_000)).toBe(true);
  });
});

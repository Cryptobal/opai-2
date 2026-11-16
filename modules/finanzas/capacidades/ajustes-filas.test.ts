import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ACTIVOS, semilla } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => registrarCapacidades(capacidades));

const nuevo = () => contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });

describe("ajustes y filas", () => {
  it("actualiza el umbral y crea una fila con dry_run previo", async () => {
    const { ctx } = nuevo();
    const aj = await executeCapability(ctx, "finanzas.ajustes.actualizar", { umbral: 2000 });
    expect(aj).toMatchObject({ ok: true, data: { umbral: 2000 } });
    // Sin saldo inicial ni semana de partida: el saldo parte del banco (ADR-073, CAR-394).
    expect(aj.ok && aj.data).not.toHaveProperty("saldoInicial");
    expect(aj.ok && aj.data).not.toHaveProperty("desde");
    const antes = (await ctx.db.flujoFila.findMany({})).length;
    await executeCapability(
      ctx,
      "finanzas.filas.crear",
      { seccion: "egreso", etiqueta: "Arriendo" },
      { dryRun: true },
    );
    expect(await ctx.db.flujoFila.findMany({})).toHaveLength(antes);
    const r = await executeCapability(ctx, "finanzas.filas.crear", {
      seccion: "egreso",
      etiqueta: "Arriendo",
      arrastre: true,
    });
    expect(r).toMatchObject({ ok: true, data: { etiqueta: "Arriendo", arrastre: true } });
  });
});

describe("finanzas.filas.crear · solo egresos (CAR-198/CAR-220)", () => {
  it("rechaza crear una fila de ingreso a mano, también en vista previa", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    for (const opts of [undefined, { dryRun: true }]) {
      const r = await executeCapability(ctx, "finanzas.filas.crear", { seccion: "ingreso", etiqueta: "Cliente" }, opts);
      expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    }
  });
});

describe("finanzas.filas · grupo de egreso", () => {
  it("crea en «Gastos» por defecto, acepta otro grupo y lo cambia después", async () => {
    const { ctx } = nuevo();
    const base = await executeCapability(ctx, "finanzas.filas.crear", { seccion: "egreso", etiqueta: "Arriendo" });
    expect(base).toMatchObject({ ok: true, data: { grupo: "gastos" } });
    const credito = await executeCapability(ctx, "finanzas.filas.crear", {
      seccion: "egreso",
      etiqueta: "Crédito banco",
      grupo: "financiamiento",
    });
    expect(credito).toMatchObject({ ok: true, data: { grupo: "financiamiento" } });
    const id = credito.ok ? (credito.data as { id: string }).id : "";
    const cambio = await executeCapability(ctx, "finanzas.filas.actualizar", { id, grupo: "impuestos" });
    expect(cambio).toMatchObject({ ok: true, data: { grupo: "impuestos" } });
    expect(await executeCapability(ctx, "finanzas.filas.actualizar", { id, grupo: "otro" })).toMatchObject({ ok: false });
  });

  it("las filas de ingreso no tienen grupo y no admiten uno", async () => {
    const { ctx } = nuevo();
    const lista = await executeCapability(ctx, "finanzas.filas.listar", { incluirInactivas: true });
    const ingreso = lista.ok ? (lista.data as { id: string; seccion: string; grupo: string | null }[]).find((f) => f.seccion === "ingreso") : undefined;
    expect(ingreso?.grupo).toBeNull();
    const r = await executeCapability(ctx, "finanzas.filas.actualizar", { id: ingreso?.id, grupo: "gastos" });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});

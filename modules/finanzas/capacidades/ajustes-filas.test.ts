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

// Observaciones no bloqueantes del Revisor en el PR 10.1: la vista previa de `ajustar` aplica el lote
// en el mismo orden que la ejecución real (y revierte), y los montos CLP topan en el máximo de las
// columnas INTEGER, para que un dry_run no pase y la escritura falle después.
import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { ctxCpq, nueva, puesto, registrarCpq } from "./cpq-ayuda";

beforeEach(registrarCpq);

const ajustar = (
  ctx: ReturnType<typeof ctxCpq>["ctx"],
  input: Record<string, unknown>,
  dryRun: boolean,
) => executeCapability(ctx, "cpq.cotizaciones.ajustar", input, { dryRun });

describe("cpq.cotizaciones.ajustar: vista previa secuencial", () => {
  it("una operación ve lo que dejó la anterior: preview y real rechazan igual", async () => {
    const { ctx } = ctxCpq();
    const c = await nueva(ctx);
    const dosComunes = {
      id: c.id,
      operaciones: [{ op: "agregar_comun" }, { op: "agregar_comun" }],
    };
    for (const dryRun of [true, false])
      expect(await ajustar(ctx, dosComunes, dryRun), `dryRun ${dryRun}`).toMatchObject({
        ok: false,
        error: { code: "UNPROCESSABLE" },
      });
  });

  it("quitar y luego editar la misma línea: NOT_FOUND en preview, como en la ejecución", async () => {
    const { ctx, tabla } = ctxCpq();
    const c = await nueva(ctx);
    await ajustar(ctx, { id: c.id, operaciones: [puesto(c.secciones[0]?.id ?? "")] }, false);
    const lineaId = String(tabla("lineaCotizacion")[0]?.["id"]);
    const lote = {
      id: c.id,
      operaciones: [
        { op: "quitar_linea", lineaId },
        { op: "actualizar_linea", lineaId, nombre: "Otra" },
      ],
    };
    for (const dryRun of [true, false])
      expect(await ajustar(ctx, lote, dryRun), `dryRun ${dryRun}`).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND" },
      });
    expect(tabla("lineaCotizacion")).toHaveLength(1);
  });

  it("la preview devuelve lo mismo que la ejecución y no deja nada escrito", async () => {
    const { ctx, tabla } = ctxCpq();
    const c = await nueva(ctx);
    const lote = {
      id: c.id,
      operaciones: [{ op: "cambiar_moneda", moneda: "CLP" }, puesto(c.secciones[0]?.id ?? "")],
    };
    const previa = await ajustar(ctx, lote, true);
    expect(tabla("lineaCotizacion")).toHaveLength(0);
    expect(tabla("versionCotizacion")[0]).toMatchObject({ revision: 0, moneda: "UF" });
    const real = await ajustar(ctx, lote, false);
    expect(previa.ok && real.ok).toBe(true);
    const sinFechas = (r: typeof real) => {
      const d = r.ok ? (r.data as { cambios: string[]; version: Record<string, unknown> }) : null;
      return {
        cambios: d?.cambios,
        revision: d?.version["revision"],
        moneda: d?.version["moneda"],
      };
    };
    expect(sinFechas(previa)).toEqual(sinFechas(real));
  });
});

describe("montos CLP dentro de INTEGER", () => {
  it("un sueldo sobre 2.147.483.647 se rechaza ya en el dry_run", async () => {
    const { ctx } = ctxCpq();
    const c = await nueva(ctx);
    const linea = (sueldoBruto: number) => ({
      id: c.id,
      operaciones: [puesto(c.secciones[0]?.id ?? "", { sueldoBruto })],
    });
    expect(await ajustar(ctx, linea(2_147_483_648), true)).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect((await ajustar(ctx, linea(2_147_483_647), true)).ok).toBe(true);
  });
});

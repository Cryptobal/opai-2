// Brief 10 · CPQ PR 10.1: renombre con antes/después en la auditoría y evento (R67), y vista previa
// de `cpq.cotizaciones.ajustar` sin escribir.
import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { ctxCpq, nueva, puesto, registrarCpq } from "./cpq-ayuda";

beforeEach(registrarCpq);

describe("cpq.cotizaciones.ajustar · renombre y vista previa", () => {
  it("renombrar audita antes/después, emite el evento y no cambia el código (R67)", async () => {
    const { ctx, eventos, tabla } = ctxCpq();
    const c = await nueva(ctx);
    const r = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id: c.id,
      operaciones: [{ op: "renombrar", titulo: "Planta 1 · 24/7" }],
    });
    expect(
      r.ok && (r.data as { cotizacion: { codigo: string; titulo: string } }).cotizacion,
    ).toEqual(expect.objectContaining({ codigo: c.codigo, titulo: "Planta 1 · 24/7" }));
    const audit = eventos.find((e) => e.capability === "cpq.cotizaciones.renombrada");
    expect(audit?.payload).toEqual({
      codigo: c.codigo,
      antes: "Guardias · Planta 1",
      despues: "Planta 1 · 24/7",
    });
    const ev = tabla("evento").find(
      (e) => (e as { tipo: string }).tipo === "cpq.cotizacion.renombrada",
    );
    expect((ev as { payload: unknown } | undefined)?.payload).toMatchObject({
      antes: "Guardias · Planta 1",
    });
  });

  it("dryRun valida y describe sin escribir", async () => {
    const { ctx, tabla } = ctxCpq();
    const c = await nueva(ctx);
    const r = await executeCapability(
      ctx,
      "cpq.cotizaciones.ajustar",
      { id: c.id, operaciones: [puesto(c.secciones[0]?.id ?? "")] },
      { dryRun: true },
    );
    expect(r.ok && (r.data as { cambios: string[] }).cambios).toEqual([
      "Línea agregada: Guardia 24/7",
    ]);
    expect(tabla("lineaCotizacion")).toHaveLength(0);
  });
});

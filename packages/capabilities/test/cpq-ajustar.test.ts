// Brief 10 · CPQ PR 10.1: `cpq.cotizaciones.ajustar` (lote tipado, todo o nada), vuelta a borrador
// al editar (R41), control optimista (§12), renombre con antes/después y evento (R67).
import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { ctxCpq, nueva, puesto, registrarCpq } from "./cpq-ayuda";

beforeEach(registrarCpq);

describe("cpq.cotizaciones.ajustar", () => {
  it("aplica el lote y sube la revisión", async () => {
    const { ctx, tabla } = ctxCpq();
    const c = await nueva(ctx);
    const r = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id: c.id,
      revisionEsperada: 0,
      operaciones: [
        puesto(c.secciones[0]?.id ?? ""),
        { op: "cambiar_moneda", moneda: "CLP" },
        { op: "agregar_comun" },
      ],
    });
    expect(r.ok).toBe(true);
    expect(
      r.ok && (r.data as { version: { revision: number; moneda: string } }).version,
    ).toMatchObject({ revision: 1, moneda: "CLP" });
    expect(tabla("lineaCotizacion")).toHaveLength(1);
    expect(tabla("seccionCotizacion")).toHaveLength(2);
  });

  it("es todo o nada: una operación inválida no deja aplicadas las anteriores", async () => {
    const { ctx, tabla } = ctxCpq();
    const c = await nueva(ctx);
    const r = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id: c.id,
      operaciones: [
        puesto(c.secciones[0]?.id ?? ""),
        { op: "quitar_linea", lineaId: "0192f3a0-0000-7000-8000-00000000dead" },
      ],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(tabla("lineaCotizacion")).toHaveLength(0);
  });

  it("revisión vieja responde CONFLICT (control optimista, §12)", async () => {
    const { ctx } = ctxCpq();
    const c = await nueva(ctx);
    await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id: c.id,
      operaciones: [{ op: "agregar_comun" }],
    });
    const r = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id: c.id,
      revisionEsperada: 0,
      operaciones: [{ op: "cambiar_moneda", moneda: "CLP" }],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("editar una versión lista la devuelve a borrador (R41)", async () => {
    const { ctx, tabla } = ctxCpq();
    const c = await nueva(ctx);
    const v = tabla("versionCotizacion")[0] as { estado: string };
    v.estado = "lista";
    const r = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id: c.id,
      operaciones: [{ op: "agregar_comun" }],
    });
    expect(
      r.ok && (r.data as { version: { estado: string }; cambios: string[] }).version.estado,
    ).toBe("borrador");
  });

  it("una versión enviada no se edita (R43)", async () => {
    const { ctx, tabla } = ctxCpq();
    const c = await nueva(ctx);
    (tabla("versionCotizacion")[0] as { estado: string }).estado = "enviada";
    const r = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id: c.id,
      operaciones: [{ op: "agregar_comun" }],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("una línea de puesto exige cargo; un cargo inexistente responde NOT_FOUND", async () => {
    const { ctx } = ctxCpq();
    const c = await nueva(ctx);
    const s = c.secciones[0]?.id ?? "";
    const sin = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id: c.id,
      operaciones: [puesto(s, { cargoId: undefined })],
    });
    expect(sin).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const otro = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id: c.id,
      operaciones: [puesto(s, { cargoId: "0192f3a0-0000-7000-8000-00000000c0ff" })],
    });
    expect(otro).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("sobrescribir personas por posición exige motivo (R21)", async () => {
    const { ctx } = ctxCpq();
    const c = await nueva(ctx);
    const r = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id: c.id,
      operaciones: [puesto(c.secciones[0]?.id ?? "", { personasPorPosicion: 300 })],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});

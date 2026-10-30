// Brief 10 · CPQ PR 10.1: alcance por filas (ADR-022). Una instalación fuera del negocio o del
// alcance del actor responde igual que una inexistente (NOT_FOUND, mismo mensaje: sin enumeración),
// y nadie se da más alcance que el propio al crear o ajustar una cotización.
import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { I2 } from "./comercial-ayuda";
import { I1, N1, ctxCpq, registrarCpq } from "./cpq-ayuda";

beforeEach(registrarCpq);

const INEXISTENTE = "0192f3a0-0000-7000-8000-00000000f0f0";
const acotado = () => ctxCpq({ alcance: { instalaciones: [] } });

describe("alcance de instalaciones en CPQ", () => {
  it("una instalación de otra cuenta (no vinculada al negocio) responde como inexistente", async () => {
    const { ctx } = ctxCpq();
    const otra = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: N1, instalacionIds: [I2] });
    const nada = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: N1, instalacionIds: [INEXISTENTE] });
    expect(otra).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(nada).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(!otra.ok && !nada.ok && otra.error.message === nada.error.message).toBe(true);
  });

  it("un actor sin la instalación en su alcance no la puede pedir: NOT_FOUND, igual que inexistente", async () => {
    const r = await executeCapability(acotado().ctx, "cpq.cotizaciones.create", { negocioId: N1, instalacionIds: [I1] });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND", message: "La instalación no existe." } });
  });

  it("sin lista, solo se cotizan las instalaciones que el actor ve: la Común sola no revela I1", async () => {
    const { ctx } = acotado();
    const sinNada = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: N1 });
    expect(sinNada).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const comun = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: N1, comun: true });
    expect(comun.ok && (comun.data as { secciones: { tipo: string }[] }).secciones.map((s) => s.tipo)).toEqual(["comun"]);
  });

  it("ajustar no agrega una sección de una instalación fuera del alcance", async () => {
    const { ctx } = acotado();
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: N1, comun: true });
    const id = c.ok ? (c.data as { id: string }).id : "";
    const r = await executeCapability(ctx, "cpq.cotizaciones.ajustar", { id, operaciones: [{ op: "agregar_seccion", instalacionId: I1 }] });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("el owner sí agrega la sección de la instalación del negocio, una sola vez", async () => {
    const { ctx } = ctxCpq();
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: N1, instalacionIds: [], comun: true });
    const id = c.ok ? (c.data as { id: string }).id : "";
    const a = await executeCapability(ctx, "cpq.cotizaciones.ajustar", { id, operaciones: [{ op: "agregar_seccion", instalacionId: I1 }] });
    expect(a.ok).toBe(true);
    const b = await executeCapability(ctx, "cpq.cotizaciones.ajustar", { id, operaciones: [{ op: "agregar_seccion", instalacionId: I1 }] });
    expect(b).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});

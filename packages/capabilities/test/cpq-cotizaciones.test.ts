// Brief 10 · CPQ PR 10.1: creación, correlativo (R54), lectura, dryRun, idempotencia, auditoría y
// estados (R40/R41) de las capacidades base, con contexto falso.
import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { TENANT_DE_PRUEBA } from "../src/testing";
import { I1, N1, ctxCpq, registrarCpq, semillaCpq } from "./cpq-ayuda";

beforeEach(registrarCpq);

const crear = (o: Record<string, unknown> = {}) => ({ negocioId: N1, ...o });

describe("cpq.cotizaciones.create", () => {
  it("crea la v1 en borrador con código CPQ-AAAA-NNN, sección por instalación, evento y auditoría", async () => {
    const { ctx, tabla, eventos } = ctxCpq();
    const r = await executeCapability(ctx, "cpq.cotizaciones.create", crear({ comun: true }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const d = r.data as {
      codigo: string;
      estado: string;
      version: number;
      vigente: boolean;
      secciones: { tipo: string; instalacionId: string | null }[];
    };
    expect(d.codigo).toMatch(/^CPQ-\d{4}-001$/);
    expect(d).toMatchObject({ estado: "borrador", version: 1, vigente: true });
    expect(d.secciones.map((s) => [s.tipo, s.instalacionId])).toEqual([
      ["instalacion", I1],
      ["comun", null],
    ]);
    expect(tabla("versionCotizacion")).toHaveLength(1);
    expect(eventos.some((e) => e.capability === "cpq.cotizaciones.create")).toBe(true);
    expect(
      tabla("evento").some((e) => (e as { tipo: string }).tipo === "cpq.cotizacion.creada"),
    ).toBe(true);
  });

  it("el correlativo sigue desde el último del año, también el importado de 1.0, e ignora los con sufijo (R54)", async () => {
    const anio = Number(
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" })
        .format(new Date())
        .slice(0, 4),
    );
    const fila = (id: string, codigo: string, numero: number | null) => ({
      id,
      tenantId: TENANT_DE_PRUEBA,
      negocioId: N1,
      codigo,
      anio,
      numero,
      titulo: "1.0",
      estado: "enviada",
      vigente: false,
    });
    const semilla = {
      ...semillaCpq(),
      cotizacion: [
        fila("0192f3a0-0000-7000-8000-00000000aa01", `CPQ-${anio}-340`, 340),
        fila("0192f3a0-0000-7000-8000-00000000aa02", `CPQ-${anio}-900-defe`, null),
      ],
    };
    const { ctx } = ctxCpq({ semilla });
    const a = await executeCapability(ctx, "cpq.cotizaciones.create", crear());
    const b = await executeCapability(ctx, "cpq.cotizaciones.create", crear());
    expect(a.ok && (a.data as { codigo: string }).codigo).toBe(`CPQ-${anio}-341`);
    expect(b.ok && (b.data as { codigo: string; vigente: boolean })).toMatchObject({
      codigo: `CPQ-${anio}-342`,
      vigente: false,
    });
  });

  it("dryRun no persiste nada", async () => {
    const { ctx, tabla } = ctxCpq();
    const r = await executeCapability(ctx, "cpq.cotizaciones.create", crear(), { dryRun: true });
    expect(r.ok).toBe(true);
    expect(tabla("cotizacion")).toHaveLength(0);
    expect(tabla("versionCotizacion")).toHaveLength(0);
  });

  it("la misma idempotencyKey no crea dos cotizaciones", async () => {
    const { ctx, tabla } = ctxCpq();
    const o = { idempotencyKey: "crear-cpq-1" };
    const a = await executeCapability(ctx, "cpq.cotizaciones.create", crear(), o);
    const b = await executeCapability(ctx, "cpq.cotizaciones.create", crear(), o);
    expect(a.ok && b.ok).toBe(true);
    expect(tabla("cotizacion")).toHaveLength(1);
  });

  it("un negocio que no es del tenant (o no existe) responde NOT_FOUND", async () => {
    const { ctx } = ctxCpq();
    const r = await executeCapability(
      ctx,
      "cpq.cotizaciones.create",
      crear({ negocioId: "0192f3a0-0000-7000-8000-00000000ffff" }),
    );
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("un negocio cerrado no se cotiza (§4)", async () => {
    const s = semillaCpq();
    const semilla = { ...s, negocio: s.negocio.map((n) => ({ ...n, estado: "ganado" })) };
    const r = await executeCapability(ctxCpq({ semilla }).ctx, "cpq.cotizaciones.create", crear());
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("validaHasta no puede ser anterior a hoy", async () => {
    const r = await executeCapability(
      ctxCpq().ctx,
      "cpq.cotizaciones.create",
      crear({ validaHasta: "2020-01-01" }),
    );
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});

describe("cpq.cotizaciones.list y get", () => {
  it("lista y abre la ficha con su versión y secciones", async () => {
    const { ctx } = ctxCpq();
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", crear());
    const id = c.ok ? (c.data as { id: string }).id : "";
    const l = await executeCapability(ctx, "cpq.cotizaciones.list", {});
    expect(l.ok && (l.data as { items: { id: string }[] }).items.map((i) => i.id)).toEqual([id]);
    const g = await executeCapability(ctx, "cpq.cotizaciones.get", { id });
    expect(g.ok && (g.data as { versiones: unknown[]; secciones: unknown[] })).toMatchObject({
      versiones: [{ numero: 1 }],
      secciones: [{ instalacionId: I1 }],
    });
  });

  it("una cotización inexistente o de otro tenant responde NOT_FOUND, igual que inexistente", async () => {
    const r = await executeCapability(ctxCpq().ctx, "cpq.cotizaciones.get", {
      id: "0192f3a0-0000-7000-8000-00000000eeee",
    });
    expect(r).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND", message: "La cotización no existe." },
    });
  });
});

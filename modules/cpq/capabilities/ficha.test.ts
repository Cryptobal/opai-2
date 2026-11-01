import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ACTIVOS, CON_COSTOS, GESTOR, NEGOCIO_1, semilla, SOLO_LECTURA } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => {
  registrarCapacidades(capacidades);
});

describe("cpq ficha y líneas (CAR-134)", () => {
  it("dry_run de línea no escribe; borrador sí; enviada no", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos: GESTOR });
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Ficha prueba",
    });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const ficha = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    expect(ficha.ok).toBe(true);
    if (!ficha.ok) throw new Error("ficha");
    const sec = (ficha.data as { secciones: { id: string }[] }).secciones[0];
    expect(sec).toBeTruthy();
    const prev = await executeCapability(
      ctx,
      "cpq.lineas.crear",
      { seccionId: sec!.id, tipo: "puesto", nombre: "Guardia", sueldoBaseClp: 700_000 },
      { dryRun: true },
    );
    expect(prev.ok).toBe(true);
    expect(await ctx.db.cpqLinea.count()).toBe(0);
    const real = await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec!.id,
      tipo: "puesto",
      nombre: "Guardia",
      sueldoBaseClp: 700_000,
    });
    expect(real.ok).toBe(true);
    await ctx.db.cpqVersion.updateMany({ where: { cotizacionId: id }, data: { estado: "enviada" } });
    const bloqueo = await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec!.id,
      tipo: "puesto",
      nombre: "Otra",
    });
    expect(bloqueo).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("sin cpq:costos.ver el cálculo no trae costos ni margen", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos: GESTOR });
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Permisos",
    });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const sin = { ...ctx, autorizar: (p: string) => SOLO_LECTURA.includes(p) };
    const r = await executeCapability(sin, "cpq.cotizaciones.calcular", { id });
    const txt = JSON.stringify(r);
    expect(txt).not.toMatch(/costoMensual|margenEfectivo|semaforo|traza/);
    expect(txt).toContain("ventaMensual");
  });

  it("con costos trae categorías y margen", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos: [...GESTOR, ...CON_COSTOS] });
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Costos" });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f.ok) throw new Error("ficha");
    const sec = (f.data as { secciones: { id: string }[] }).secciones[0];
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec!.id,
      tipo: "puesto",
      nombre: "Turno",
      sueldoBaseClp: 650_000,
    });
    const calc = await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
    expect(calc.ok).toBe(true);
    expect(JSON.stringify(calc)).toContain("margenEfectivoPct");
  });
});

// CAR-192 · Reglas de estado de la cotización: objetivo y márgenes de la empresa, requisitos de
// «Dejar lista», versión congelada desde «lista», «Reabrir para editar» y «Nueva versión».
import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "@opai/capabilities/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import { ACTIVOS, CON_COSTOS, fijarMargenBajo, GESTOR, NEGOCIO_1, semilla, SOLO_LECTURA } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => registrarCapacidades(capacidades));
beforeEach(() => vi.restoreAllMocks());

const ctxCon = (permisos: readonly string[] = [...GESTOR, ...CON_COSTOS, "cpq:aprobar"]) =>
  contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos });

const ejecutar = (ctx: Contexto, id: string, input: unknown, dryRun = false) =>
  executeCapability(ctx, id, input, { dryRun });

async function ajuste(ctx: Contexto, clave: string, valor: number) {
  await ctx.db.ajuste.create({
    data: { tenantId: TENANT_DE_PRUEBA, ambito: "tenant", sujetoId: TENANT_DE_PRUEBA, modulo: "cpq", clave, valor },
  });
}

async function crear(ctx: Contexto, conPuesto = true) {
  mockMotorLegal();
  const c = await ejecutar(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Reglas de estado" });
  if (!c.ok) throw new Error("fixture");
  const id = (c.data as { id: string }).id;
  if (conPuesto) {
    const f = await ejecutar(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f.ok) throw new Error("ficha");
    const seccionId = (f.data as { secciones: { id: string }[] }).secciones[0]!.id;
    const l = await ejecutar(ctx, "cpq.lineas.crear", { seccionId, tipo: "puesto", nombre: "Turno", sueldoBaseClp: 650_000 });
    if (!l.ok) throw new Error(`línea: ${JSON.stringify(l.error)}`);
    await ejecutar(ctx, "cpq.cotizaciones.calcular", { id });
  }
  return id;
}

async function ficha(ctx: Contexto, id: string) {
  const f = await ejecutar(ctx, "cpq.cotizaciones.ficha", { id });
  if (!f.ok) throw new Error("ficha");
  return f.data as {
    version: { id: string; estado: string; editable: boolean };
    meta: {
      estadoFicha: { estado: string; siguiente: { accion: string } };
      puedeReabrir: boolean;
      puedeCrearVersion: boolean;
      avisoRecalculo: unknown;
    };
    parametros?: { margenObjetivoPct: number | null };
    calculo: { ventaMensual: number | null; margenEfectivoPct: number; requiereAprobacion: boolean };
  };
}

describe("margen objetivo, mínimo y alerta de la empresa", () => {
  it("una cotización nueva nace con el objetivo por defecto, no con 0 %", async () => {
    const { ctx } = ctxCon();
    const id = await crear(ctx);
    const f = await ficha(ctx, id);
    expect(f.parametros?.margenObjetivoPct).toBe(200_000);
    expect(f.calculo.margenEfectivoPct).toBeGreaterThanOrEqual(190_000);
    expect(f.calculo.requiereAprobacion).toBe(false);
    expect(f.meta.estadoFicha.estado).toBe("por_dejar_lista");
  });

  it("el objetivo de la empresa manda al crear", async () => {
    const { ctx } = ctxCon();
    await ajuste(ctx, "margen_objetivo_defecto_pct", 25);
    const f = await ficha(ctx, await crear(ctx));
    expect(f.parametros?.margenObjetivoPct).toBe(250_000);
  });

  it("un objetivo vacío en una versión antigua usa el de la empresa, nunca 0 %", async () => {
    const { ctx } = ctxCon();
    await ajuste(ctx, "margen_objetivo_defecto_pct", 30);
    const id = await crear(ctx);
    await ctx.db.cpqVersion.updateMany({ where: { cotizacionId: id }, data: { margenObjetivoPct: null } });
    const f = await ficha(ctx, id);
    expect(f.parametros?.margenObjetivoPct).toBe(300_000);
    expect(f.calculo.margenEfectivoPct).toBeGreaterThanOrEqual(290_000);
  });

  it("el mínimo es un ajuste: subirlo sobre el objetivo exige aprobación", async () => {
    const { ctx } = ctxCon();
    await ajuste(ctx, "margen_minimo_pct", 35);
    const id = await crear(ctx);
    const f = await ficha(ctx, id);
    expect(f.calculo.requiereAprobacion).toBe(true);
    expect(f.meta.estadoFicha.estado).toBe("margen_bajo");
    expect(f.meta.estadoFicha.siguiente.accion).toBe("pedir_aprobacion");
  });
});

describe("cpq.cotizaciones.marcar_lista: requisitos", () => {
  it("rechaza sin puestos, también en vista previa", async () => {
    const { ctx } = ctxCon();
    const id = await crear(ctx, false);
    for (const dryRun of [true, false]) {
      const r = await ejecutar(ctx, "cpq.cotizaciones.marcar_lista", { id }, dryRun);
      expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    }
    expect((await ficha(ctx, id)).meta.estadoFicha.estado).toBe("incompleta");
  });

  it("rechaza costos pendientes", async () => {
    const { ctx } = ctxCon();
    const id = await crear(ctx, false);
    const f0 = await ficha(ctx, id);
    const seccionId = (await ejecutar(ctx, "cpq.cotizaciones.ficha", { id }).then((r) => (r.ok ? r.data : null)) as {
      secciones: { id: string }[];
    }).secciones[0]!.id;
    await ejecutar(ctx, "cpq.lineas.crear", { seccionId, tipo: "puesto", nombre: "Sin sueldo" });
    const r = await ejecutar(ctx, "cpq.cotizaciones.marcar_lista", { id });
    expect(r).toMatchObject({ ok: false, error: { message: expect.stringContaining("pendientes") } });
    expect(f0.version.estado).toBe("borrador");
  });

  it("rechaza valores desactualizados (huella distinta de la guardada) y pide recalcular", async () => {
    const { ctx } = ctxCon();
    const id = await crear(ctx);
    await ctx.db.cpqLinea.updateMany({ data: { huellaJuegoValores: "07e:valores-de-otra-fecha" } });
    for (const dryRun of [true, false]) {
      const r = await ejecutar(ctx, "cpq.cotizaciones.marcar_lista", { id }, dryRun);
      expect(r).toMatchObject({ ok: false, error: { message: expect.stringContaining("recalcula") } });
    }
    const f = await ficha(ctx, id);
    expect(f.meta.estadoFicha).toMatchObject({ estado: "desactualizada", siguiente: { accion: "recalcular" } });
    // Recalcular guarda la huella actual y deja pasar.
    expect((await ejecutar(ctx, "cpq.cotizaciones.calcular", { id })).ok).toBe(true);
    expect((await ejecutar(ctx, "cpq.cotizaciones.marcar_lista", { id })).ok).toBe(true);
  });

  it("rechaza margen bajo el mínimo y manda a pedir aprobación", async () => {
    const { ctx } = ctxCon();
    const id = await crear(ctx);
    await fijarMargenBajo(ctx, id);
    const r = await ejecutar(ctx, "cpq.cotizaciones.marcar_lista", { id });
    expect(r).toMatchObject({ ok: false, error: { message: expect.stringContaining("pide aprobación") } });
    expect((await ficha(ctx, id)).meta.estadoFicha.estado).toBe("margen_bajo");
  });

  it("solicitar aprobación también rechaza si hay valores desactualizados", async () => {
    const { ctx } = ctxCon();
    const id = await crear(ctx);
    await fijarMargenBajo(ctx, id);
    await ctx.db.cpqLinea.updateMany({ data: { huellaJuegoValores: "07e:vieja" } });
    const r = await ejecutar(ctx, "cpq.cotizaciones.solicitar_aprobacion", { id });
    expect(r).toMatchObject({ ok: false, error: { message: expect.stringContaining("recalcula") } });
  });

  it("vista previa no cambia nada; la real congela el cálculo y audita", async () => {
    const { ctx, eventos } = ctxCon();
    const id = await crear(ctx);
    expect((await ejecutar(ctx, "cpq.cotizaciones.marcar_lista", { id }, true)).ok).toBe(true);
    expect((await ficha(ctx, id)).version.estado).toBe("borrador");
    expect((await ejecutar(ctx, "cpq.cotizaciones.marcar_lista", { id })).ok).toBe(true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } });
    expect(v?.estado).toBe("lista");
    expect(v?.calculoCongeladoJson).toContain("margenEfectivoPct");
    expect(eventos.some((e) => e.capability === "cpq.cotizaciones.marcar_lista")).toBe(true);
  });

  it("exige permiso de gestión", async () => {
    const { ctx } = ctxCon();
    const id = await crear(ctx);
    const lector = { ...ctx, autorizar: (p: string) => SOLO_LECTURA.includes(p) };
    expect(await ejecutar(lector, "cpq.cotizaciones.marcar_lista", { id })).toMatchObject({ ok: false });
    expect((await ficha(ctx, id)).version.estado).toBe("borrador");
  });
});

describe("versión lista: congelada, sin contradicciones", () => {
  it("una versión aprobada no vuelve a decir «margen bajo» ni se recalcula", async () => {
    const { ctx } = ctxCon();
    const id = await crear(ctx);
    await fijarMargenBajo(ctx, id);
    expect((await ejecutar(ctx, "cpq.cotizaciones.solicitar_aprobacion", { id })).ok).toBe(true);
    expect((await ficha(ctx, id)).meta.estadoFicha.estado).toBe("en_aprobacion");
    expect((await ejecutar(ctx, "cpq.cotizaciones.aprobar", { id })).ok).toBe(true);
    const antes = await ficha(ctx, id);
    expect(antes.meta.estadoFicha).toMatchObject({ estado: "lista_para_enviar", siguiente: { accion: "enviar" } });
    expect(antes.meta.avisoRecalculo).toBeNull();
    // Aunque cambie el dato de base, lo aprobado se muestra tal cual.
    await ctx.db.cpqLinea.updateMany({ data: { sueldoBaseClp: 9_999_999, huellaJuegoValores: "07e:otra" } });
    const despues = await ficha(ctx, id);
    expect(despues.calculo.ventaMensual).toBe(antes.calculo.ventaMensual);
    expect(despues.meta.avisoRecalculo).toBeNull();
    expect(despues.meta.estadoFicha.estado).toBe("lista_para_enviar");
  });

  it("no se edita ni se recalcula: se pide «Reabrir para editar»", async () => {
    const { ctx } = ctxCon();
    const id = await crear(ctx);
    await ejecutar(ctx, "cpq.cotizaciones.marcar_lista", { id });
    const f = await ficha(ctx, id);
    expect(f.version.editable).toBe(false);
    const seccionId = ((await ejecutar(ctx, "cpq.cotizaciones.ficha", { id })) as { data: { secciones: { id: string }[] } }).data.secciones[0]!.id;
    const edicion = await ejecutar(ctx, "cpq.lineas.crear", { seccionId, tipo: "puesto", nombre: "Otro", sueldoBaseClp: 650_000 });
    expect(edicion).toMatchObject({ ok: false, error: { message: expect.stringContaining("Reabrir para editar") } });
    const calc = await ejecutar(ctx, "cpq.cotizaciones.calcular", { id });
    expect(calc).toMatchObject({ ok: false, error: { message: expect.stringContaining("Reabrir para editar") } });
  });
});

describe("cpq.cotizaciones.reabrir y nueva versión", () => {
  it("lista vuelve a borrador (vista previa no cambia, real audita) sin chocar con el índice único", async () => {
    const { ctx, eventos } = ctxCon();
    const id = await crear(ctx);
    await ejecutar(ctx, "cpq.cotizaciones.marcar_lista", { id });
    expect((await ficha(ctx, id)).meta.puedeReabrir).toBe(true);
    expect((await ejecutar(ctx, "cpq.cotizaciones.reabrir", { id }, true)).ok).toBe(true);
    expect((await ficha(ctx, id)).version.estado).toBe("lista");
    expect((await ejecutar(ctx, "cpq.cotizaciones.reabrir", { id })).ok).toBe(true);
    const f = await ficha(ctx, id);
    expect(f).toMatchObject({ version: { estado: "borrador", editable: true } });
    expect(f.meta.estadoFicha.estado).toBe("por_dejar_lista");
    expect(eventos.some((e) => e.capability === "cpq.cotizaciones.reabrir")).toBe(true);
    const versiones = await ctx.db.cpqVersion.count({ where: { cotizacionId: id } });
    expect(versiones).toBe(1);
  });

  it("solo se reabre una cotización lista y con permiso de gestión", async () => {
    const { ctx } = ctxCon();
    const id = await crear(ctx);
    expect(await ejecutar(ctx, "cpq.cotizaciones.reabrir", { id })).toMatchObject({ ok: false });
    await ejecutar(ctx, "cpq.cotizaciones.marcar_lista", { id });
    const lector = { ...ctx, autorizar: (p: string) => SOLO_LECTURA.includes(p) };
    expect(await ejecutar(lector, "cpq.cotizaciones.reabrir", { id })).toMatchObject({ ok: false });
    expect((await ficha(ctx, id)).version.estado).toBe("lista");
  });

  it("«Nueva versión» solo con la última ya enviada; en lista se pide reabrir", async () => {
    const { ctx } = ctxCon();
    const id = await crear(ctx);
    for (const estado of ["borrador", "lista"]) {
      await ctx.db.cpqVersion.updateMany({ where: { cotizacionId: id }, data: { estado } });
      const f = await ficha(ctx, id);
      expect(f.meta.puedeCrearVersion).toBe(false);
      expect(await ejecutar(ctx, "cpq.versiones.crear", { cotizacionId: id })).toMatchObject({ ok: false });
    }
    await ctx.db.cpqVersion.updateMany({ where: { cotizacionId: id }, data: { estado: "enviada" } });
    expect((await ficha(ctx, id)).meta.puedeCrearVersion).toBe(true);
    expect(await ejecutar(ctx, "cpq.versiones.crear", { cotizacionId: id })).toMatchObject({
      ok: true,
      data: { numero: 2 },
    });
  });
});

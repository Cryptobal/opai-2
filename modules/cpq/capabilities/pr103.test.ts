import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { publicacionesReferencia } from "../../../packages/domain/src/remuneraciones/referencia.fixture";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as valoresLegales from "../persistencia/valores-legales";
import {
  ACTIVOS,
  CON_COSTOS,
  CONTACTO_1,
  CUENTA_1,
  ETAPA_PROPUESTA,
  GESTOR,
  NEGOCIO_1,
  semilla,
} from "./fixtures";
import { capacidades } from "./index";
import { prepararEnvio } from "./preparar-envio.test-helper";

beforeAll(() => {
  registrarCapacidades(capacidades);
});

function ctxGestor(conCostos = false) {
  return contextoDePrueba({
    semilla: semilla(),
    modulosActivos: ACTIVOS,
    permisos: conCostos ? [...GESTOR, ...CON_COSTOS, "cpq:aprobar"] : GESTOR,
  });
}

describe("CAR-135 pr103", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ficha con solo cpq:cotizaciones.read", async () => {
    const { ctx } = ctxGestor();
    const created = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Para lector",
    });
    if (!created.ok) throw new Error("fixture");
    const id = (created.data as { id: string }).id;
    const soloLectura = {
      ...ctx,
      autorizar: (p: string) => p === "cpq:cotizaciones.read",
    };
    const ficha = await executeCapability(soloLectura, "cpq.cotizaciones.ficha", { id });
    expect(ficha.ok).toBe(true);
  });

  it("enviar exige contacto de la cuenta del negocio", async () => {
    vi.spyOn(valoresLegales, "valoresLegalesTenant").mockResolvedValue(publicacionesReferencia());
    const { ctx } = ctxGestor(true);
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Contacto",
    });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f0.ok) throw new Error("ficha");
    const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec.id,
      tipo: "puesto",
      nombre: "Turno",
      sueldoBaseClp: 650_000,
    });
    await prepararEnvio(ctx, id);
    const sinContacto = await executeCapability(ctx, "cpq.cotizaciones.enviar", { id } as { id: string });
    expect(sinContacto.ok).toBe(false);
    const env = await executeCapability(ctx, "cpq.cotizaciones.enviar", {
      id,
      contactoId: CONTACTO_1,
    });
    expect(env.ok).toBe(true);
    const neg = await ctx.db.negocio.findFirst({ where: { id: NEGOCIO_1 } });
    expect(neg?.etapaId).toBe(ETAPA_PROPUESTA);
    expect(neg?.cotizacionEnviadaEn).toBeTruthy();
    expect(await ctx.db.documentoVinculo.count({ where: { entidadId: id } })).toBe(1);
  });

  it("enviar persiste calculoCongeladoJson", async () => {
    vi.spyOn(valoresLegales, "valoresLegalesTenant").mockResolvedValue(publicacionesReferencia());
    const { ctx } = ctxGestor(true);
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Enviar congelado",
    });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f0.ok) throw new Error("ficha");
    const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec.id,
      tipo: "puesto",
      nombre: "Turno",
      sueldoBaseClp: 650_000,
    });
    await prepararEnvio(ctx, id);
    const env = await executeCapability(ctx, "cpq.cotizaciones.enviar", {
      id,
      contactoId: CONTACTO_1,
    });
    expect(env.ok).toBe(true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } });
    expect(v?.calculoCongeladoJson).toBeTruthy();
    expect(v?.estado).toBe("enviada");
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    expect(f.ok).toBe(true);
    if (!f.ok) throw new Error("ficha");
    expect((f.data as { calculo: { ventaMensual: number | null } }).calculo.ventaMensual).toBe(
      v?.ventaMensualClp,
    );
  });

  it("correlativos.fijar no baja el contador", async () => {
    const { ctx } = contextoDePrueba({
      semilla: semilla(),
      modulosActivos: ACTIVOS,
      permisos: [...GESTOR, "cpq:modelo.manage"],
    });
    await executeCapability(ctx, "cpq.correlativos.fijar", { anio: 2026, ultimo: 42 });
    const bajar = await executeCapability(ctx, "cpq.correlativos.fijar", { anio: 2026, ultimo: 10 });
    expect(bajar.ok).toBe(false);
    const fila = await ctx.db.cpqCorrelativo.findFirst({ where: { anio: 2026 } });
    expect(fila?.ultimo).toBe(42);
  });

  it("correlativos.fijar dry_run no escribe", async () => {
    const { ctx } = contextoDePrueba({
      semilla: semilla(),
      modulosActivos: ACTIVOS,
      permisos: [...GESTOR, "cpq:modelo.manage"],
    });
    const prev = await executeCapability(
      ctx,
      "cpq.correlativos.fijar",
      { anio: 2026, ultimo: 42 },
      { dryRun: true },
    );
    expect(prev.ok).toBe(true);
    expect(await ctx.db.cpqCorrelativo.count()).toBe(0);
    const real = await executeCapability(ctx, "cpq.correlativos.fijar", { anio: 2026, ultimo: 42 });
    expect(real.ok).toBe(true);
    const fila = await ctx.db.cpqCorrelativo.findFirst({ where: { anio: 2026 } });
    expect(fila?.ultimo).toBe(42);
  });

  it("clonar desde versión enviada recalcula precio de ítem", async () => {
    vi.spyOn(valoresLegales, "valoresLegalesTenant").mockResolvedValue(publicacionesReferencia());
    const { ctx } = ctxGestor(true);
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Origen clonar",
    });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f0.ok) throw new Error("ficha");
    const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec.id,
      tipo: "item",
      nombre: "Equipo",
      itemCodigo: "equipo",
      precioUnitarioClp: 999_999,
    });
    await ctx.db.cpqVersion.updateMany({ where: { cotizacionId: id }, data: { estado: "enviada" } });
    const clon = await executeCapability(ctx, "cpq.cotizaciones.clonar", { id });
    expect(clon.ok).toBe(true);
    if (!clon.ok) throw new Error("clon");
    const versionId = (clon.data as { versionId: string }).versionId;
    const secc = await ctx.db.cpqSeccion.findFirst({ where: { versionId } });
    const linea = await ctx.db.cpqLinea.findFirst({ where: { seccionId: secc!.id } });
    expect(linea?.precioUnitarioClp ?? null).toBeNull();
  });
});

describe("CAR-135 corrección 1 (lecturas puras y permisos)", () => {
  it("marca_documento.get y catalogo_items.list no siembran filas", async () => {
    const { ctx } = ctxGestor();
    const marcasAntes = await ctx.db.cpqMarcaDocumento.count();
    const itemsAntes = await ctx.db.cpqCatalogoItem.count();
    await executeCapability(ctx, "cpq.marca_documento.get", {});
    await executeCapability(ctx, "cpq.catalogo_items.list", {});
    expect(await ctx.db.cpqMarcaDocumento.count()).toBe(marcasAntes);
    expect(await ctx.db.cpqCatalogoItem.count()).toBe(itemsAntes);
  });

  it("ficha, preview_pdf, calcular dry_run y enviar dry_run no siembran catálogo", async () => {
    vi.spyOn(valoresLegales, "valoresLegalesTenant").mockResolvedValue(publicacionesReferencia());
    const { ctx } = ctxGestor(true);
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Lectura catálogo",
    });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f0.ok) throw new Error("ficha");
    const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec.id,
      tipo: "puesto",
      nombre: "Turno",
      sueldoBaseClp: 650_000,
    });
    await ctx.db.cpqCatalogoItem.deleteMany({});
    await ctx.db.cpqCatalogoCategoria.deleteMany({});
    expect(await ctx.db.cpqCatalogoItem.count()).toBe(0);

    const soloLectura = {
      ...ctx,
      autorizar: (p: string) => p === "cpq:cotizaciones.read",
    };
    expect((await executeCapability(soloLectura, "cpq.cotizaciones.ficha", { id })).ok).toBe(true);
    expect(await ctx.db.cpqCatalogoItem.count()).toBe(0);
    expect((await executeCapability(soloLectura, "cpq.cotizaciones.preview_pdf", { id })).ok).toBe(true);
    expect(await ctx.db.cpqCatalogoItem.count()).toBe(0);
    expect(
      (await executeCapability(ctx, "cpq.cotizaciones.calcular", { id }, { dryRun: true })).ok,
    ).toBe(true);
    expect(await ctx.db.cpqCatalogoItem.count()).toBe(0);
    await prepararEnvio(ctx, id);
    const itemsTrasPreparar = await ctx.db.cpqCatalogoItem.count();
    expect(
      (
        await executeCapability(
          ctx,
          "cpq.cotizaciones.enviar",
          { id, contactoId: CONTACTO_1 },
          { dryRun: true },
        )
      ).ok,
    ).toBe(true);
    expect(await ctx.db.cpqCatalogoItem.count()).toBe(itemsTrasPreparar);
  });

  it("catalogo_items.list oculta costoUnitarioClp sin cpq:costos.ver", async () => {
    const { ctx } = ctxGestor(true);
    await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Cat seed" });
    const sinCostos = {
      ...ctx,
      autorizar: (p: string) => GESTOR.includes(p),
    };
    const r = await executeCapability(sinCostos, "cpq.catalogo_items.list", {});
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("list");
    const items = (r.data as { items: Record<string, unknown>[] }).items;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => !("costoUnitarioClp" in i))).toBe(true);
  });

  it("enviar dry_run no deja la versión enviada ni documentos", async () => {
    vi.spyOn(valoresLegales, "valoresLegalesTenant").mockResolvedValue(publicacionesReferencia());
    const { ctx } = ctxGestor(true);
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Dry enviar",
    });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f0.ok) throw new Error("ficha");
    const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec.id,
      tipo: "puesto",
      nombre: "Turno",
      sueldoBaseClp: 650_000,
    });
    await prepararEnvio(ctx, id);
    const prev = await executeCapability(
      ctx,
      "cpq.cotizaciones.enviar",
      { id, contactoId: CONTACTO_1 },
      { dryRun: true },
    );
    expect(prev.ok).toBe(true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } });
    expect(v?.estado).toBe("lista");
    expect(await ctx.db.documentoVinculo.count({ where: { entidadId: id } })).toBe(0);
  });

  it("enviar rechaza contacto sin correo", async () => {
    vi.spyOn(valoresLegales, "valoresLegalesTenant").mockResolvedValue(publicacionesReferencia());
    const { ctx } = ctxGestor(true);
    const sinMail = "0192f3a0-0000-7000-8000-0000000000a9";
    await ctx.db.contacto.create({
      data: {
        id: sinMail,
        tenantId: ctx.tenantId,
        cuentaId: CUENTA_1,
        nombres: "Sin",
        apellidos: "Mail",
        email: null,
      },
    });
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Sin mail",
    });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f0.ok) throw new Error("ficha");
    const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec.id,
      tipo: "puesto",
      nombre: "Turno",
      sueldoBaseClp: 650_000,
    });
    await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
    const r = await executeCapability(ctx, "cpq.cotizaciones.enviar", {
      id,
      contactoId: sinMail,
    });
    expect(r.ok).toBe(false);
  });
});

describe("cpq correlativos catalogo seed", () => {
  it("create siembra catálogo con fórmulas del tenant", async () => {
    const { ctx } = ctxGestor(true);
    expect(await ctx.db.cpqCatalogoItem.count()).toBe(0);
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Seed catálogo",
    });
    if (!c.ok) throw new Error("create");
    const items = await ctx.db.cpqCatalogoItem.findMany();
    expect(items.some((i) => i.codigo === "uniforme" && i.modoCalculo === "formula.uniforme")).toBe(true);
  });

  it("el catálogo del tenant afecta el cálculo", async () => {
    vi.spyOn(valoresLegales, "valoresLegalesTenant").mockResolvedValue(publicacionesReferencia());
    const { ctx } = ctxGestor(true);
    const c0 = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Catálogo seed",
    });
    if (!c0.ok) throw new Error("seed");
    const item = await ctx.db.cpqCatalogoItem.findFirst({ where: { codigo: "equipo" } });
    if (!item) throw new Error("equipo");
    await ctx.db.cpqCatalogoItem.update({
      where: { id: item.id },
      data: { costoUnitarioClp: 80_000 },
    });
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Catálogo",
    });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f0.ok) throw new Error("ficha");
    const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec.id,
      tipo: "puesto",
      nombre: "Turno",
      sueldoBaseClp: 650_000,
      posiciones: 1,
    });
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec.id,
      tipo: "item",
      nombre: "Equipo",
      itemCodigo: "equipo",
    });
    const calc = await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
    expect(calc.ok).toBe(true);
    if (!calc.ok) throw new Error("calc");
    const venta = (calc.data as { ventaMensual: number | null }).ventaMensual;
    await ctx.db.cpqCatalogoItem.update({
      where: { id: item.id },
      data: { costoUnitarioClp: 160_000 },
    });
    const calc2 = await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
    if (!calc2.ok) throw new Error("calc2");
    const venta2 = (calc2.data as { ventaMensual: number | null }).ventaMensual;
    expect(venta2).toBeGreaterThan(venta ?? 0);
  });
});

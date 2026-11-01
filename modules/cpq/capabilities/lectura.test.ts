import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ACTIVOS, CON_COSTOS, NEGOCIO_1, NEGOCIO_2, semilla, SOLO_LECTURA } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => {
  registrarCapacidades(capacidades);
});

async function conDosCotizaciones(permisos?: readonly string[]) {
  const h = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
  const a = await executeCapability(h.ctx, "cpq.cotizaciones.create", {
    negocioId: NEGOCIO_1,
    titulo: "Guardias planta norte",
  });
  const b = await executeCapability(h.ctx, "cpq.cotizaciones.create", {
    negocioId: NEGOCIO_2,
    titulo: "Aseo oficinas",
  });
  if (!a.ok || !b.ok) throw new Error("fixture");
  // Mismo contexto y misma base, con otros permisos: lo que cambia es solo quién lee.
  const lectura = permisos ? { ...h.ctx, autorizar: (p: string) => permisos.includes(p) } : h.ctx;
  return { h, lectura, a: (a.data as { id: string }).id, b: (b.data as { id: string }).id };
}

describe("cpq.cotizaciones.list / get", () => {
  it("lista con la última versión y filtra por negocio y por estado", async () => {
    const { h, a } = await conDosCotizaciones();
    const todas = await executeCapability(h.ctx, "cpq.cotizaciones.list", {});
    expect(todas).toMatchObject({ ok: true });
    const porNegocio = await executeCapability(h.ctx, "cpq.cotizaciones.list", {
      negocioId: NEGOCIO_1,
    });
    expect(porNegocio).toMatchObject({
      ok: true,
      data: {
        items: [{ id: a, negocioTitulo: "Negocio de prueba", version: { numero: 1 } }],
      },
    });
    const lista = await executeCapability(h.ctx, "cpq.cotizaciones.list", { estado: "enviada" });
    expect(lista).toMatchObject({ ok: true, data: { items: [] } });
  });

  it("deja fuera las archivadas salvo que se pidan", async () => {
    const { h, a } = await conDosCotizaciones();
    await h.ctx.db.cpqVersion.updateMany({
      where: { cotizacionId: a },
      data: { estado: "archivada" },
    });
    const sin = await executeCapability(h.ctx, "cpq.cotizaciones.list", {});
    const con = await executeCapability(h.ctx, "cpq.cotizaciones.list", {
      incluirArchivadas: true,
    });
    expect(sin.ok && (sin.data as { items: unknown[] }).items).toHaveLength(1);
    expect(con.ok && (con.data as { items: unknown[] }).items).toHaveLength(2);
  });

  it("pagina por cursor sin repetir ni saltar filas", async () => {
    const { h, a, b } = await conDosCotizaciones();
    const p1 = await executeCapability(h.ctx, "cpq.cotizaciones.list", { limite: 1 });
    if (!p1.ok) throw new Error("unreachable");
    const d1 = p1.data as { items: { id: string }[]; siguiente: string | null };
    expect(d1.items).toHaveLength(1);
    const p2 = await executeCapability(h.ctx, "cpq.cotizaciones.list", {
      limite: 1,
      cursor: d1.siguiente ?? undefined,
    });
    if (!p2.ok) throw new Error("unreachable");
    const d2 = p2.data as { items: { id: string }[]; siguiente: string | null };
    expect([d1.items[0]?.id, d2.items[0]?.id].sort()).toEqual([a, b].sort());
    expect(d2.siguiente).toBeNull();
  });

  it("get devuelve la cotización con sus versiones y una cotización inexistente es NOT_FOUND", async () => {
    const { h, a } = await conDosCotizaciones();
    const r = await executeCapability(h.ctx, "cpq.cotizaciones.get", { id: a });
    expect(r).toMatchObject({
      ok: true,
      data: {
        cotizacion: { id: a },
        versiones: [{ numero: 1, estado: "borrador" }],
        secciones: [],
      },
    });
    expect(
      await executeCapability(h.ctx, "cpq.cotizaciones.get", {
        id: "0192f3a0-0000-7000-8000-0000000000ff",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(
      await executeCapability(h.ctx, "cpq.cotizaciones.get", { id: a, version: 9 }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });
});

describe("cpq:costos.ver en el servidor (R59, CA15)", () => {
  it("sin el permiso no viaja la clave `margen`, ni en lista ni en ficha", async () => {
    const { lectura, a } = await conDosCotizaciones(SOLO_LECTURA);
    const lista = await executeCapability(lectura, "cpq.cotizaciones.list", {});
    const ficha = await executeCapability(lectura, "cpq.cotizaciones.get", { id: a });
    expect(JSON.stringify(lista)).not.toContain("margen");
    expect(JSON.stringify(ficha)).not.toContain("margen");
    expect(JSON.stringify(ficha)).not.toContain("objetivoPct");
  });

  it("con el permiso sí trae el modo y el objetivo de margen", async () => {
    const { lectura, a } = await conDosCotizaciones(CON_COSTOS);
    const ficha = await executeCapability(lectura, "cpq.cotizaciones.get", { id: a });
    expect(ficha).toMatchObject({
      ok: true,
      data: { versiones: [{ margen: { modo: "margen_sobre_venta", objetivoPct: null } }] },
    });
  });

  it("sin cpq:cotizaciones.read no se lee nada", async () => {
    const { lectura: sin } = await conDosCotizaciones([]);
    expect(await executeCapability(sin, "cpq.cotizaciones.list", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});

import { beforeEach, describe, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { contextoDePrueba } from "../src/testing";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const ok = <T>(r: { ok: boolean; data?: unknown }) => {
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.data as T;
};

describe("core.cuentas.*", () => {
  it("crea con RUT normalizado, emite el evento y rechaza el RUT duplicado", async () => {
    const { ctx, tabla } = contextoDePrueba();
    const previa = await executeCapability(
      ctx,
      "core.cuentas.create",
      { nombre: "Logística Andina", rut: "76.543.210-3" },
      { dryRun: true },
    );
    expect(previa).toMatchObject({
      ok: true,
      dryRun: true,
      data: { rut: "76543210-3", estado: "prospecto" },
    });
    expect(tabla("cuenta")).toHaveLength(0);
    const c = ok<{ id: string; rut: string }>(
      await executeCapability(ctx, "core.cuentas.create", {
        nombre: "Logística Andina",
        rut: "76.543.210-3",
      }),
    );
    expect(c.rut).toBe("76543210-3");
    expect(tabla("evento").map((e) => e["tipo"])).toEqual(["core.cuenta.creada"]);
    const dup = await executeCapability(ctx, "core.cuentas.create", {
      nombre: "Otra",
      rut: "76543210-3",
    });
    expect(dup).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    const malo = await executeCapability(ctx, "core.cuentas.create", {
      nombre: "Mala",
      rut: "76543210-1",
    });
    expect(malo).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });

  it("lista con búsqueda y paginación por cursor", async () => {
    const { ctx } = contextoDePrueba();
    for (const n of ["Alfa", "Beta", "Gamma"])
      await executeCapability(ctx, "core.cuentas.create", { nombre: n });
    const p1 = ok<{ items: { nombre: string }[]; siguiente: string }>(
      await executeCapability(ctx, "core.cuentas.list", { limite: 2 }),
    );
    expect(p1.items.map((i) => i.nombre)).toEqual(["Alfa", "Beta"]);
    const p2 = ok<{ items: { nombre: string }[]; siguiente: null }>(
      await executeCapability(ctx, "core.cuentas.list", { limite: 2, cursor: p1.siguiente }),
    );
    expect(p2).toEqual({ items: [expect.objectContaining({ nombre: "Gamma" })], siguiente: null });
    const q = ok<{ items: unknown[] }>(
      await executeCapability(ctx, "core.cuentas.list", { q: "amm" }),
    );
    expect(q.items).toHaveLength(1);
  });

  it("respeta la máquina de estados y fija las fechas de cliente", async () => {
    const { ctx } = contextoDePrueba();
    const { id } = ok<{ id: string }>(
      await executeCapability(ctx, "core.cuentas.create", { nombre: "Cuenta" }),
    );
    const malo = await executeCapability(ctx, "core.cuentas.set_estado", {
      id,
      estado: "cliente_inactivo",
    });
    expect(malo).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const a = ok<{ clienteDesde: string }>(
      await executeCapability(ctx, "core.cuentas.set_estado", { id, estado: "cliente_activo" }),
    );
    expect(a.clienteDesde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const i = ok<{ clienteHasta: string }>(
      await executeCapability(ctx, "core.cuentas.set_estado", { id, estado: "cliente_inactivo" }),
    );
    expect(i.clienteHasta).toBeTruthy();
  });

  it("no archiva con instalaciones activas; un solo contacto principal", async () => {
    const { ctx, tabla } = contextoDePrueba();
    const { id } = ok<{ id: string }>(
      await executeCapability(ctx, "core.cuentas.create", { nombre: "Cuenta" }),
    );
    tabla("instalacion").push({
      id: "i1",
      tenantId: ctx.tenantId,
      cuentaId: id,
      nombre: "Planta",
      estado: "activa",
      archivadaEn: null,
    });
    expect(await executeCapability(ctx, "core.cuentas.archive", { id })).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE" },
    });
    const base = { cuentaId: id, apellidos: "Soto", esPrincipal: true };
    await executeCapability(ctx, "core.contactos.create", {
      ...base,
      nombres: "Ana",
      email: "ana@x.cl",
    });
    await executeCapability(ctx, "core.contactos.create", { ...base, nombres: "Beto" });
    expect(
      tabla("contacto")
        .filter((c) => c["esPrincipal"])
        .map((c) => c["nombres"]),
    ).toEqual(["Beto"]);
    const dup = await executeCapability(ctx, "core.contactos.create", {
      ...base,
      nombres: "C",
      email: "ANA@x.cl",
    });
    expect(dup).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("un viewer lee pero no escribe; un supervisor lee", async () => {
    const viewer = contextoDePrueba({ rol: "viewer" });
    expect((await executeCapability(viewer.ctx, "core.cuentas.list", {})).ok).toBe(true);
    expect(
      await executeCapability(viewer.ctx, "core.cuentas.create", { nombre: "Xy" }),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});

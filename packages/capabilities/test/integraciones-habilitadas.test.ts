import { randomBytes } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo, executeCapability, limpiarRegistro, registrarCapacidades } from "../src";
import { leerExportDeOpai1 } from "../src/comercial/importar-1-0-origen";
import { contextoDePrueba } from "../src/testing";

// CAR-321: la integración «opai1» (traer datos desde OPAI 1) solo existe para las empresas que
// Plataforma habilita en `core.integraciones_habilitadas`. Para el resto es como si no existiera.
beforeAll(() => {
  process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
});
beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

type Ctx = ReturnType<typeof contextoDePrueba>["ctx"];
async function habilitar(ctx: Ctx, tenantIds: string[]) {
  await ctx.db.ajustePlataforma.create({
    data: { modulo: "core", clave: "integraciones_habilitadas", valor: { opai1: tenantIds }, version: 1 },
  });
}
const proveedores = (r: { ok: boolean; data?: unknown }) =>
  r.ok ? (r.data as { proveedor: string }[]).map((i) => i.proveedor) : [];

describe("integraciones restringidas (CAR-321)", () => {
  it("una empresa no habilitada no ve «opai1» ni puede usarla", async () => {
    const { ctx } = contextoDePrueba();
    const lista = await executeCapability(ctx, "core.integraciones.list", {});
    expect(proveedores(lista)).not.toContain("opai1");
    expect(proveedores(lista)).toContain("web4leads");
    const get = await executeCapability(ctx, "core.integraciones.get", { proveedor: "opai1" });
    expect(get).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const set = await executeCapability(ctx, "core.integraciones.set_secreto", {
      proveedor: "opai1",
      nombre: "url",
      valor: "https://ejemplo.test/api/export/opai2/v1",
    });
    expect(set).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await expect(leerExportDeOpai1(ctx, async () => ({}) as never)).rejects.toThrow(/no está habilitado/);
  });

  it("configurar y probar tampoco existen para una empresa no habilitada", async () => {
    const { ctx } = contextoDePrueba();
    const conf = await executeCapability(ctx, "core.integraciones.configurar", { proveedor: "opai1", modalidad: "propia" });
    expect(conf).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const probar = await executeCapability(ctx, "core.integraciones.probar", { proveedor: "opai1" });
    expect(probar).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("ninguna empresa ve en sus ajustes qué otras están habilitadas", async () => {
    const { ctx } = contextoDePrueba();
    const otra = "00000000-0000-7000-8000-000000000999";
    await habilitar(ctx, [ctx.tenantId, otra]);
    const get = await executeCapability(ctx, "core.config.get", { modulo: "core" });
    expect(get.ok).toBe(true);
    expect(JSON.stringify(get)).not.toContain(otra);
    expect(JSON.stringify(get)).not.toContain("integraciones_habilitadas");
    const set = await executeCapability(ctx, "core.config.set", { modulo: "core", clave: "integraciones_habilitadas", valor: {} });
    expect(set.ok).toBe(false);
  });

  it("habilitar otra empresa no la habilita para esta", async () => {
    const { ctx } = contextoDePrueba();
    await habilitar(ctx, ["00000000-0000-7000-8000-000000000999"]);
    const lista = await executeCapability(ctx, "core.integraciones.list", {});
    expect(proveedores(lista)).not.toContain("opai1");
  });

  it("la empresa habilitada la ve y puede guardar sus datos", async () => {
    const { ctx } = contextoDePrueba();
    await habilitar(ctx, [ctx.tenantId]);
    const lista = await executeCapability(ctx, "core.integraciones.list", {});
    expect(proveedores(lista)).toContain("opai1");
    const set = await executeCapability(ctx, "core.integraciones.set_secreto", {
      proveedor: "opai1",
      nombre: "url",
      valor: "https://ejemplo.test/api/export/opai2/v1",
    });
    expect(set).toMatchObject({ ok: true });
  });
});

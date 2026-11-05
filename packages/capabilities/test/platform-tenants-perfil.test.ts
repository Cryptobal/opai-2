// CAR-188 · RUT y razón social de la empresa en Plataforma: se piden al crearla, se corrigen desde
// la ficha y no se repiten. La restricción única real se prueba en `platform-perfil-db.test.ts`.
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

const owner = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
const support = { ...USUARIO_DE_PRUEBA, platformRole: "support" as const };
const nueva = {
  slug: "aseos-sur",
  nombre: "Aseos del Sur",
  vertical: "aseo",
  adminEmail: "jefa@aseos.cl",
  razonSocial: "Aseos del Sur SpA",
  rut: "76.123.456-0",
};
const contexto = (usuario: typeof owner | typeof support = owner) =>
  contextoDePrueba({ rol: null, usuario, conTenant: false, semilla: semillaTenant() });

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

describe("platform.tenants.create · datos tributarios", () => {
  it("pide razón social y RUT, y rechaza un dígito verificador malo", async () => {
    const { ctx } = contexto();
    const { rut: _r, ...sinRut } = nueva;
    const { razonSocial: _s, ...sinRazon } = nueva;
    for (const entrada of [sinRut, sinRazon, { ...nueva, rut: "76.123.456-9" }])
      expect(await executeCapability(ctx, "platform.tenants.create", entrada)).toMatchObject({
        ok: false,
        error: { code: "INVALID_INPUT" },
      });
  });

  it("guarda el RUT canónico en el perfil de la empresa nueva", async () => {
    const { ctx, tabla } = contexto();
    const r = await executeCapability(ctx, "platform.tenants.create", nueva);
    expect(r).toMatchObject({ ok: true });
    expect(tabla("perfilEmpresa")).toMatchObject([
      { rut: "76123456-0", razonSocial: "Aseos del Sur SpA" },
    ]);
  });

  it("un RUT que ya tiene otra empresa da CONFLICT y no deja una empresa a medias", async () => {
    const { ctx, tabla } = contexto();
    await executeCapability(ctx, "platform.tenants.create", nueva);
    const otra = await executeCapability(ctx, "platform.tenants.create", {
      ...nueva,
      slug: "aseos-norte",
      adminEmail: "otra@aseos.cl",
    });
    expect(otra).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(tabla("tenant").filter((t) => t["slug"] === "aseos-norte")).toHaveLength(0);
  });

  it("adoptar fija el RUT si faltaba y rechaza uno distinto al que ya tiene", async () => {
    const { ctx, tabla } = contexto();
    const adoptar = { ...nueva, slug: "gard", adoptarExistente: true };
    expect(await executeCapability(ctx, "platform.tenants.create", adoptar)).toMatchObject({
      ok: true,
    });
    expect(tabla("perfilEmpresa")).toMatchObject([
      { tenantId: TENANT_DE_PRUEBA, rut: "76123456-0" },
    ]);
    const otro = await executeCapability(ctx, "platform.tenants.create", {
      ...adoptar,
      rut: "77.888.999-4",
    });
    expect(otro).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });
});

describe("platform.tenants.perfil_get / perfil_set", () => {
  const datos = {
    tenantId: TENANT_DE_PRUEBA,
    razonSocial: "Gard Security SpA",
    rut: "77.888.999-4",
  };

  it("una empresa sin RUT sale incompleta; guardar la completa; la vista previa no guarda", async () => {
    const { ctx, tabla } = contexto();
    const get = () =>
      executeCapability(ctx, "platform.tenants.perfil_get", { tenantId: TENANT_DE_PRUEBA });
    expect(await get()).toMatchObject({ ok: true, data: { rut: null, completo: false } });
    await executeCapability(ctx, "platform.tenants.perfil_set", datos, { dryRun: true });
    expect(tabla("perfilEmpresa")).toHaveLength(0);
    const set = await executeCapability(ctx, "platform.tenants.perfil_set", datos);
    expect(set).toMatchObject({
      ok: true,
      data: { antes: null, despues: { rut: "77888999-4", razonSocial: "Gard Security SpA" } },
    });
    expect(await get()).toMatchObject({ ok: true, data: { rut: "77888999-4", completo: true } });
  });

  it("rechaza un RUT inválido y una empresa que no existe", async () => {
    const { ctx } = contexto();
    expect(
      await executeCapability(ctx, "platform.tenants.perfil_set", { ...datos, rut: "1-9" }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(
      await executeCapability(ctx, "platform.tenants.perfil_set", {
        ...datos,
        tenantId: "0192f3a0-0000-7000-8000-0000000000ff",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("support lee pero no escribe", async () => {
    const { ctx } = contexto(support);
    expect(
      await executeCapability(ctx, "platform.tenants.perfil_get", { tenantId: TENANT_DE_PRUEBA }),
    ).toMatchObject({ ok: true });
    expect(await executeCapability(ctx, "platform.tenants.perfil_set", datos)).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});

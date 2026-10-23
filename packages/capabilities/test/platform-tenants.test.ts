import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

const plataforma = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
const nuevo = {
  slug: "aseos-sur",
  nombre: "Aseos del Sur",
  vertical: "aseo",
  adminEmail: "jefa@aseos.cl",
};

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

describe("platform.tenants.*", () => {
  it("sin platformRole: FORBIDDEN aunque sea owner del tenant", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    expect(await executeCapability(ctx, "platform.tenants.list", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("create sin tenant actual: crea en trial, activa core, invita al owner y audita en el tenant nuevo", async () => {
    const { ctx, tabla, correos, eventos } = contextoDePrueba({
      rol: null,
      usuario: plataforma,
      conTenant: false,
    });
    const r = await executeCapability(ctx, "platform.tenants.create", nuevo);
    expect(r).toMatchObject({
      ok: true,
      data: { adoptado: false, invitacion: { email: "jefa@aseos.cl", rol: "owner" } },
    });
    const id = r.ok ? (r.data as { tenantId: string }).tenantId : "";
    expect(tabla("tenant")).toMatchObject([
      { slug: "aseos-sur", estado: "trial", timezone: "America/Santiago" },
    ]);
    expect(tabla("tenantModule")).toMatchObject([
      { tenantId: id, moduloId: "core", estado: "activo" },
    ]);
    expect(correos[0]?.texto).toContain("https://test.opai.cl/invitacion/aseos-sur/");
    expect(eventos).toMatchObject([{ tenantId: id, capability: "platform.tenants.create" }]);
  });

  it("slug reservado o inválido: INVALID_INPUT", async () => {
    const { ctx } = contextoDePrueba({ rol: null, usuario: plataforma, conTenant: false });
    for (const slug of ["www", "app", "test", "api", "platform", "Mayús", "a_b"]) {
      const r = await executeCapability(ctx, "platform.tenants.create", { ...nuevo, slug });
      expect(r, slug).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    }
  });

  it("slug existente: CONFLICT; con adoptarExistente lo adopta (activa core e invita)", async () => {
    const { ctx, tabla } = contextoDePrueba({
      rol: null,
      usuario: plataforma,
      conTenant: false,
      semilla: semillaTenant(),
    });
    const gard = {
      ...nuevo,
      slug: "gard",
      nombre: "Gard Security",
      vertical: "seguridad",
      adminEmail: "carlos@gard.cl",
    };
    const choca = await executeCapability(ctx, "platform.tenants.create", gard);
    expect(choca).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(choca.ok === false && choca.error.message).toMatch(/usar la existente/);
    const r = await executeCapability(ctx, "platform.tenants.create", {
      ...gard,
      adoptarExistente: true,
    });
    expect(r).toMatchObject({ ok: true, data: { tenantId: TENANT_DE_PRUEBA, adoptado: true } });
    expect(tabla("tenant")).toHaveLength(1);
    expect(tabla("invitation")).toMatchObject([{ email: "carlos@gard.cl", rol: "owner" }]);
  });

  it("adoptar cuando el administrador ya es miembro no falla ni invita", async () => {
    const { ctx, tabla } = contextoDePrueba({
      rol: null,
      usuario: plataforma,
      conTenant: false,
      semilla: semillaTenant(),
    });
    const r = await executeCapability(ctx, "platform.tenants.create", {
      ...nuevo,
      slug: "gard",
      adminEmail: "ana@prueba.cl",
      adoptarExistente: true,
    });
    expect(r).toMatchObject({ ok: true, data: { adoptado: true, invitacion: null } });
    expect(tabla("invitation")).toHaveLength(0);
  });

  it("list cuenta usuarios; set_estado suspende; support solo lee", async () => {
    const { ctx } = contextoDePrueba({
      rol: null,
      usuario: plataforma,
      conTenant: false,
      semilla: semillaTenant(),
    });
    expect(await executeCapability(ctx, "platform.tenants.list", {})).toMatchObject({
      ok: true,
      data: [{ slug: "gard", usuarios: 2 }],
    });
    const s = await executeCapability(ctx, "platform.tenants.set_estado", {
      tenantId: TENANT_DE_PRUEBA,
      estado: "suspendido",
    });
    expect(s).toMatchObject({ ok: true, data: { estado: "suspendido" } });
    const soporte = contextoDePrueba({
      rol: null,
      usuario: { ...plataforma, platformRole: "support" },
      conTenant: false,
    });
    const w = await executeCapability(soporte.ctx, "platform.tenants.set_estado", {
      tenantId: TENANT_DE_PRUEBA,
      estado: "activo",
    });
    expect(w).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});

describe("core.me", () => {
  it("devuelve usuario, tenant, rol, portales y permisos (sin finanzas para gerente)", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.me", {});
    expect(r).toMatchObject({
      ok: true,
      data: { tenant: { slug: "gard" }, rol: "owner", portales: ["erp"], actor: { tipo: "user" } },
    });
    expect(r.ok && (r.data as { permisos: string[] }).permisos).toContain("core:users.manage");
  });
});

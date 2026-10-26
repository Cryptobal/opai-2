import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba } from "../src/testing";
import { M1, M2, semillaTenant } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

describe("core.roles.* (crear, editar, asignar)", () => {
  it("un owner crea un rol con permisos del catálogo; queda auditado y no en vista previa", async () => {
    const { ctx, tabla, eventos } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const prev = await executeCapability(
      ctx,
      "core.roles.create",
      { nombre: "Central de monitoreo", permisos: ["core:instalaciones.read"] },
      { dryRun: true },
    );
    expect(prev).toMatchObject({ ok: true, data: { nombre: "Central de monitoreo" } });
    expect(tabla("rol")).toHaveLength(0);
    const r = await executeCapability(ctx, "core.roles.create", {
      nombre: "Central de monitoreo",
      permisos: ["core:instalaciones.read", "core:cuentas.read"],
    });
    expect(r).toMatchObject({ ok: true, data: { sistema: false, archivado: false } });
    expect(tabla("rol")).toHaveLength(1);
    expect(eventos.map((e) => e.capability)).toContain("core.roles.create");
  });

  it("un gerente no puede crear roles (no gestiona usuarios)", async () => {
    const { ctx } = contextoDePrueba({ rol: "gerente", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.roles.create", {
      nombre: "Rol equipo",
      permisos: [],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("nadie concede un permiso que no tiene: un admin no incluye core:tenant.delete", async () => {
    const { ctx } = contextoDePrueba({ rol: "admin", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.roles.create", {
      nombre: "Casi dios",
      permisos: ["core:tenant.delete"],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(r.ok === false && r.error.message).toMatch(/no tienes/);
  });

  it("un admin concede permisos de gestión que un rol base no incluiría (los tiene, §16.2)", async () => {
    // El bloqueo financiero vive en el dominio (permisos-efectivos.test.ts): finanzas/nómina las
    // declara el módulo y aquí no están registradas. A nivel de capacidad se comprueba la regla
    // general "nadie concede más de lo que tiene": el admin sí tiene gestión de usuarios y keys.
    const { ctx } = contextoDePrueba({ rol: "admin", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.roles.create", {
      nombre: "Gestor de accesos",
      permisos: ["core:users.manage", "core:apikeys.manage"],
    });
    expect(r).toMatchObject({ ok: true });
  });

  it("un rol del tenant nunca concede platform:*", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.roles.create", {
      nombre: "Intruso",
      permisos: ["platform:tenants.manage"],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("un agente no crea roles (soloPersonas)", async () => {
    const { ctx } = contextoDePrueba({
      rol: "owner",
      actor: { tipo: "agent", id: "k1", viaUserId: M1 },
      scopes: ["*"],
      semilla: semillaTenant(),
    });
    const r = await executeCapability(ctx, "core.roles.create", {
      nombre: "Rol agente",
      permisos: [],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("asignar un rol archivado falla; el rol owner no admite rol personalizado", async () => {
    const semilla = {
      ...semillaTenant(),
      rol: [
        {
          id: "0192f3a0-0000-7000-8000-0000000000e1",
          tenantId: "0192f3a0-0000-7000-8000-000000000001",
          nombre: "Archivado",
          sistema: false,
          permisos: [],
          archivadoEn: new Date(),
        },
      ],
    };
    const { ctx } = contextoDePrueba({ rol: "owner", semilla });
    const archivado = await executeCapability(ctx, "core.roles.assign", {
      membershipId: M2,
      roleId: "0192f3a0-0000-7000-8000-0000000000e1",
    });
    expect(archivado).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const aOwner = await executeCapability(ctx, "core.roles.assign", {
      membershipId: M1,
      roleId: "0192f3a0-0000-7000-8000-0000000000e1",
    });
    expect(aOwner).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});

describe("autorización con rol personalizado y excepciones", () => {
  it("un rol personalizado concede solo sus permisos", async () => {
    const con = contextoDePrueba({
      rol: "viewer",
      permisosRol: ["core:users.read"],
      semilla: semillaTenant(),
    });
    expect(await executeCapability(con.ctx, "core.users.list", {})).toMatchObject({ ok: true });
    const sin = contextoDePrueba({
      rol: "viewer",
      permisosRol: ["core:cuentas.read"],
      semilla: semillaTenant(),
    });
    expect(await executeCapability(sin.ctx, "core.users.list", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("una excepción que deniega gana aunque el rol conceda", async () => {
    const con = contextoDePrueba({
      rol: "owner",
      excepciones: [{ permiso: "core:users.read", conceder: false }],
      semilla: semillaTenant(),
    });
    expect(await executeCapability(con.ctx, "core.users.list", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("una excepción que concede habilita un permiso que el rol base no da", async () => {
    const { ctx } = contextoDePrueba({
      rol: "viewer",
      excepciones: [{ permiso: "core:users.read", conceder: true }],
      semilla: semillaTenant(),
    });
    expect(await executeCapability(ctx, "core.users.list", {})).toMatchObject({ ok: true });
  });
});

describe("core.excepciones.set", () => {
  it("concede, deniega y quita una excepción; conceder exige tenerlo", async () => {
    const { ctx, tabla } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const concede = await executeCapability(ctx, "core.excepciones.set", {
      membershipId: M2,
      permiso: "core:cuentas.read",
      efecto: "conceder",
    });
    expect(concede).toMatchObject({ ok: true, data: { conceder: true } });
    expect(tabla("permisoExcepcion")).toHaveLength(1);
    const quita = await executeCapability(ctx, "core.excepciones.set", {
      membershipId: M2,
      permiso: "core:cuentas.read",
      efecto: "ninguna",
    });
    expect(quita).toMatchObject({ ok: true, data: null });
    expect(tabla("permisoExcepcion")).toHaveLength(0);
  });

  it("un admin no puede conceder como excepción un permiso que no tiene", async () => {
    const { ctx } = contextoDePrueba({ rol: "admin", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.excepciones.set", {
      membershipId: M2,
      permiso: "core:tenant.delete",
      efecto: "conceder",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});

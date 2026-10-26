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
    // general "nadie concede más de lo que tiene": el admin sí tiene gestión de usuarios y keys. Pero
    // que el rol creado contenga `core:users.manage` NO habilita a quien lo lleve a gestionar roles
    // (eso es owner/admin, §16.2; se comprueba en el escalamiento de más abajo).
    const { ctx } = contextoDePrueba({ rol: "admin", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.roles.create", {
      nombre: "Gestor de accesos",
      permisos: ["core:users.manage", "core:apikeys.manage"],
    });
    expect(r).toMatchObject({ ok: true });
  });

  it("los comodines se expanden al guardar: el rol no hereda permisos futuros (§16.2)", async () => {
    const { ctx, tabla } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.roles.create", {
      nombre: "Todo core",
      permisos: ["core:*"],
    });
    expect(r).toMatchObject({ ok: true });
    const guardado = tabla("rol")[0]?.["permisos"] as string[];
    expect(guardado).toContain("core:tenant.read");
    expect(guardado).toContain("core:users.manage");
    // Se guarda la lista concreta, nunca el comodín que regalaría permisos agregados después.
    expect(guardado).not.toContain("core:*");
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

// Cada caso es un intento de escalar privilegios y el rechazo esperado (revisión 5658269602).
describe("escalamiento rechazado (§16.2, ADR-022)", () => {
  // (1) El actor tiene el rol base alto pero un rol personalizado que lo limita a users.manage.
  // Devolver a alguien a su rol base (roleId null) le daría a ese otro más de lo que el actor puede.
  it("(1) no se escala volviendo al rol base con roleId null", async () => {
    const { ctx } = contextoDePrueba({
      rol: "admin",
      permisosRol: ["core:users.manage"],
      semilla: semillaTenant("admin"),
    });
    const r = await executeCapability(ctx, "core.roles.assign", { membershipId: M2, roleId: null });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  // (2) Quitar una denegación restituye el permiso del rol: si el actor no puede concederlo, no se
  // quita (nadie escala quitando una denegación, propia o ajena).
  it("(2) no se escala quitando una denegación de un permiso que el actor no tiene", async () => {
    const semilla = {
      ...semillaTenant("admin"),
      permisoExcepcion: [
        {
          id: "0192f3a0-0000-7000-8000-0000000000f1",
          tenantId: "0192f3a0-0000-7000-8000-000000000001",
          membershipId: M2,
          permiso: "core:cuentas.read",
          conceder: false,
        },
      ],
    };
    const { ctx } = contextoDePrueba({
      rol: "admin",
      permisosRol: ["core:users.manage"],
      semilla,
    });
    const r = await executeCapability(ctx, "core.excepciones.set", {
      membershipId: M2,
      permiso: "core:cuentas.read",
      efecto: "ninguna",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  // (3) Al owner no se le recorta con excepciones, ni siquiera al último owner.
  it("(3) no se puede negar un permiso a un owner con una excepción", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.excepciones.set", {
      membershipId: M1,
      permiso: "core:tenant.read",
      efecto: "denegar",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  // (4) Tener core:users.manage dentro de un rol personalizado no habilita a gestionar roles:
  // crear roles y anotar excepciones es solo de owner/admin (rol base).
  it("(4) un rol con core:users.manage no habilita a gestionar roles si no es owner/admin", async () => {
    const con = () =>
      contextoDePrueba({
        rol: "gerente",
        permisosRol: ["core:users.manage"],
        semilla: semillaTenant(),
      });
    const crear = await executeCapability(con().ctx, "core.roles.create", {
      nombre: "Rol prohibido",
      permisos: [],
    });
    expect(crear).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const excep = await executeCapability(con().ctx, "core.excepciones.set", {
      membershipId: M2,
      permiso: "core:users.read",
      efecto: "conceder",
    });
    expect(excep).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  // (5) users.update e invite miran el acceso REAL: un admin con un rol personalizado restringido no
  // asigna ni invita admin aunque su rol base sea admin.
  it("(5) users.update e invite no asignan un rol por encima del acceso real del actor", async () => {
    const con = () =>
      contextoDePrueba({
        rol: "admin",
        permisosRol: ["core:users.manage", "core:users.read"],
        semilla: semillaTenant("viewer"),
      });
    const update = await executeCapability(con().ctx, "core.users.update", {
      membershipId: M2,
      rol: "admin",
    });
    expect(update).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const invite = await executeCapability(con().ctx, "core.users.invite", {
      email: "nuevo@prueba.cl",
      rol: "admin",
    });
    expect(invite).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  // (7) Un comodín no se guarda como excepción (regalaría permisos agregados después).
  it("(7) una excepción con comodín se rechaza", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.excepciones.set", {
      membershipId: M2,
      permiso: "core:*",
      efecto: "conceder",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});

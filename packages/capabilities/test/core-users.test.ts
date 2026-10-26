import { permisosDe } from "@opai/domain";
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { catalogoPermisos } from "../src/core/me";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { M1, M2, semillaTenant } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

describe("core.users.*", () => {
  it("lista usuarios con nombre y correo; viewer puede leer, no gestionar", async () => {
    const { ctx } = contextoDePrueba({ rol: "viewer", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.users.list", {});
    expect(r).toMatchObject({
      ok: true,
      data: [{ email: "ana@prueba.cl", rol: "owner" }, { email: "beto@prueba.cl" }],
    });
    const u = await executeCapability(ctx, "core.users.update", {
      membershipId: M2,
      rol: "viewer",
    });
    expect(u).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("el último owner no se puede degradar, suspender ni eliminar", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    for (const [id, input] of [
      ["core.users.update", { membershipId: M1, rol: "admin" }],
      ["core.users.update", { membershipId: M1, estado: "suspendida" }],
      ["core.users.remove", { membershipId: M1 }],
    ] as const) {
      const r = await executeCapability(ctx, id, input);
      expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
      expect(r.ok === false && r.error.message).toMatch(/último owner/);
    }
  });

  it("con dos owners sí se puede degradar a uno", async () => {
    const { ctx, eventos } = contextoDePrueba({ rol: "owner", semilla: semillaTenant("owner") });
    const r = await executeCapability(ctx, "core.users.update", { membershipId: M1, rol: "admin" });
    expect(r).toMatchObject({ ok: true, data: { rol: "admin" } });
    expect(eventos).toHaveLength(1);
  });

  it("un gerente con rol a medida equivalente a admin no sube a admin base ni invita admin (§16.2)", async () => {
    // El rol personalizado concede TODO el acceso efectivo de admin: `validarConcedeRol` pasaría; lo
    // que frena la escalada es `puedeAsignarRol` sobre el rol base (gerente), no el acceso efectivo.
    const permisosRol = permisosDe("admin", catalogoPermisos(), []);
    const { ctx } = contextoDePrueba({ rol: "gerente", permisosRol, semilla: semillaTenant("viewer") });
    const sube = await executeCapability(ctx, "core.users.update", { membershipId: M2, rol: "admin" });
    expect(sube).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(sube.ok === false && sube.error.message).toMatch(/por encima/);
    const invita = await executeCapability(ctx, "core.users.invite", {
      email: "nuevo@prueba.cl",
      rol: "admin",
    });
    expect(invita).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(invita.ok === false && invita.error.message).toMatch(/por encima/);
  });

  it("promover a owner deja roleId nulo y borra sus denegaciones en la misma transacción (§16.2)", async () => {
    const ROL_ID = "0192f3a0-0000-7000-8000-0000000000d1";
    const base = semillaTenant("gerente");
    const semilla = {
      ...base,
      membership: base.membership.map((m) => (m.id === M2 ? { ...m, roleId: ROL_ID } : m)),
      rol: [
        {
          id: ROL_ID,
          tenantId: TENANT_DE_PRUEBA,
          nombre: "Gerente a medida",
          permisos: ["core:users.read"],
          sistema: false,
          archivadoEn: null,
        },
      ],
      permisoExcepcion: [
        {
          id: "0192f3a0-0000-7000-8000-0000000000e1",
          tenantId: TENANT_DE_PRUEBA,
          membershipId: M2,
          permiso: "finanzas:ver",
          conceder: false,
        },
      ],
    };
    const { ctx, tabla } = contextoDePrueba({ rol: "owner", semilla });
    const r = await executeCapability(ctx, "core.users.update", { membershipId: M2, rol: "owner" });
    expect(r).toMatchObject({ ok: true, data: { rol: "owner" } });
    expect(tabla("membership").find((m) => m["id"] === M2)?.["roleId"]).toBeNull();
    expect(tabla("permisoExcepcion")).toHaveLength(0);
  });

  it("quitar al último owner con acceso total se rechaza (un viewer no cuenta como owner)", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant("viewer") });
    const r = await executeCapability(ctx, "core.users.remove", { membershipId: M1 });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(r.ok === false && r.error.message).toMatch(/último owner/);
  });

  it("un admin no toca owners ni asigna owner", async () => {
    const { ctx } = contextoDePrueba({ rol: "admin", semilla: semillaTenant("viewer") });
    const aOwner = await executeCapability(ctx, "core.users.update", {
      membershipId: M2,
      rol: "owner",
    });
    const tocaOwner = await executeCapability(ctx, "core.users.remove", { membershipId: M1 });
    expect(aOwner).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(tocaOwner).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("remove en vista previa no elimina; real sí y queda auditado", async () => {
    const { ctx, tabla, eventos } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    await executeCapability(ctx, "core.users.remove", { membershipId: M2 }, { dryRun: true });
    expect(tabla("membership")).toHaveLength(2);
    await executeCapability(ctx, "core.users.remove", { membershipId: M2 });
    expect(tabla("membership")).toHaveLength(1);
    expect(eventos.map((e) => e.capability)).toEqual(["core.users.remove"]);
  });
});

describe("core.users.invite", () => {
  it("crea la invitación con solo el hash del token y envía el enlace por correo", async () => {
    const { ctx, tabla, correos } = contextoDePrueba({ rol: "admin", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.users.invite", {
      email: " Nuevo@Prueba.cl ",
      rol: "gerente",
    });
    expect(r).toMatchObject({
      ok: true,
      data: { email: "nuevo@prueba.cl", rol: "gerente", portales: ["erp"] },
    });
    const [inv] = tabla("invitation");
    const enlace = correos[0]?.texto.match(/invitacion\/gard\/(\S+)/)?.[1] ?? "";
    expect(enlace.length).toBeGreaterThan(40);
    expect(inv?.["tokenHash"]).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(inv)).not.toContain(enlace);
  });

  it("a alguien que ya es miembro: CONFLICT 'ya pertenece'", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.users.invite", {
      email: "beto@prueba.cl",
      rol: "viewer",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("acepta la invitación con el usuario correcto y rechaza otro correo", async () => {
    const base = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    await executeCapability(base.ctx, "core.users.invite", {
      email: "beto@prueba.cl",
      rol: "viewer",
    }).catch(() => null);
    await executeCapability(base.ctx, "core.users.invite", {
      email: "carla@prueba.cl",
      rol: "viewer",
    });
    const token = base.correos.at(-1)?.texto.match(/invitacion\/gard\/(\S+)/)?.[1] ?? "";
    base.tabla("user").push({
      id: "0192f3a0-0000-7000-8000-0000000000c1",
      name: "Carla",
      email: "carla@prueba.cl",
    });
    const comoAna = await executeCapability(base.ctx, "core.invitations.accept", { token });
    expect(comoAna).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    base.ctx.usuario = {
      id: "0192f3a0-0000-7000-8000-0000000000c1",
      nombre: "Carla",
      email: "carla@prueba.cl",
      platformRole: null,
    };
    base.ctx.actor = { tipo: "user", id: base.ctx.usuario.id };
    const ok = await executeCapability(base.ctx, "core.invitations.accept", { token });
    expect(ok).toMatchObject({ ok: true, data: { rol: "viewer" } });
    const otraVez = await executeCapability(base.ctx, "core.invitations.accept", { token });
    expect(otraVez).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});

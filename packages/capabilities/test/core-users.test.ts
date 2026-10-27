import { permisosDe } from "@opai/domain";
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { catalogoPermisos } from "../src/core/me";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
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

  it("el miembro trae rol base, rol personalizado (null) y último acceso (null sin sesión)", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.users.list", {});
    expect(r).toMatchObject({
      ok: true,
      data: [{ rol: "owner", roleId: null, rolNombre: null, ultimoAccesoEn: null }, {}],
    });
  });

  it("asigna un rol personalizado en una sola llamada y conserva el rol base (A21)", async () => {
    const ROL_ID = "0192f3a0-0000-7000-8000-0000000000d2";
    const base = semillaTenant("gerente");
    const semilla = {
      ...base,
      rol: [
        {
          id: ROL_ID,
          tenantId: TENANT_DE_PRUEBA,
          nombre: "Central",
          permisos: ["core:instalaciones.read"],
          sistema: false,
          archivadoEn: null,
        },
      ],
    };
    const { ctx, tabla } = contextoDePrueba({ rol: "owner", semilla });
    const r = await executeCapability(ctx, "core.users.update", {
      membershipId: M2,
      roleId: ROL_ID,
    });
    expect(r).toMatchObject({
      ok: true,
      data: { roleId: ROL_ID, rol: "gerente", rolNombre: "Central" },
    });
    expect(tabla("membership").find((m) => m["id"] === M2)?.["roleId"]).toBe(ROL_ID);
    // Quitar el personalizado (roleId null) vuelve al rol base.
    const quita = await executeCapability(ctx, "core.users.update", {
      membershipId: M2,
      roleId: null,
    });
    expect(quita).toMatchObject({ ok: true, data: { roleId: null, rol: "gerente" } });
  });

  it("una API key no asigna ni quita un rol personalizado por roleId: FORBIDDEN (review §3)", async () => {
    const ROL_ID = "0192f3a0-0000-7000-8000-0000000000d4";
    const KEY = "0192f3a0-0000-7000-8000-00000000c0de";
    const base = semillaTenant("gerente");
    const semilla = {
      ...base,
      rol: [
        {
          id: ROL_ID,
          tenantId: TENANT_DE_PRUEBA,
          nombre: "Central",
          permisos: ["core:instalaciones.read"],
          sistema: false,
          archivadoEn: null,
        },
      ],
    };
    // Actor agente con el acceso del responsable owner: pasa permiso y jerarquía; lo que lo frena es
    // la regla de que un rol personalizado solo lo toca una persona (como core.roles.assign).
    const { ctx } = contextoDePrueba({
      rol: "owner",
      semilla,
      actor: { tipo: "agent", id: KEY, viaUserId: USUARIO_DE_PRUEBA.id },
      agente: {
        apiKeyId: KEY,
        nombre: "Agente RR.HH.",
        presupuestoMensualMicro: null,
        autonomia: {},
      },
    });
    const asigna = await executeCapability(ctx, "core.users.update", {
      membershipId: M2,
      roleId: ROL_ID,
    });
    expect(asigna).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(asigna.ok === false && asigna.error.message).toMatch(/API key/);
    const quita = await executeCapability(ctx, "core.users.update", {
      membershipId: M2,
      roleId: null,
    });
    expect(quita).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    // Pero la misma key sí cambia portales o estado: solo se bloquea el roleId, no la capacidad entera.
    const portales = await executeCapability(ctx, "core.users.update", {
      membershipId: M2,
      portales: ["erp", "terreno"],
    });
    expect(portales).toMatchObject({ ok: true, data: { portales: ["erp", "terreno"] } });
  });

  it("asignar por roleId no escala: no asignas un rol con permisos que no tienes (§16.2)", async () => {
    const ROL_ID = "0192f3a0-0000-7000-8000-0000000000d3";
    const base = semillaTenant("admin");
    const semilla = {
      ...base,
      rol: [
        {
          id: ROL_ID,
          tenantId: TENANT_DE_PRUEBA,
          nombre: "Casi dios",
          permisos: ["core:tenant.delete"],
          sistema: false,
          archivadoEn: null,
        },
      ],
    };
    const { ctx } = contextoDePrueba({ rol: "admin", semilla });
    const r = await executeCapability(ctx, "core.users.update", {
      membershipId: M2,
      roleId: ROL_ID,
    });
    expect(r).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", detalles: { permisos: ["core:tenant.delete"] } },
    });
  });

  it("el último owner no se puede degradar, suspender ni eliminar", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    // update/suspender usan el texto de la sábana («único owner»); remove, su propio texto.
    for (const [id, input, patron] of [
      ["core.users.update", { membershipId: M1, rol: "admin" }, /único owner de la empresa/],
      [
        "core.users.update",
        { membershipId: M1, estado: "suspendida" },
        /único owner de la empresa/,
      ],
      ["core.users.remove", { membershipId: M1 }, /último owner/],
    ] as const) {
      const r = await executeCapability(ctx, id, input);
      expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
      expect(r.ok === false && r.error.message).toMatch(patron);
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
    const { ctx } = contextoDePrueba({
      rol: "gerente",
      permisosRol,
      semilla: semillaTenant("viewer"),
    });
    const sube = await executeCapability(ctx, "core.users.update", {
      membershipId: M2,
      rol: "admin",
    });
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

  it("coherencia rol-portal (NÚCLEO-D1): 'cliente' se rechaza para cualquier rol de membresía", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant("viewer") });
    const r = await executeCapability(ctx, "core.users.update", {
      membershipId: M2,
      portales: ["erp", "cliente"],
    });
    expect(r).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE", message: 'El rol "viewer" no admite el portal "cliente".' },
    });
  });

  it("coherencia rol-portal: cambiar el rol vuelve a validar los portales que ya tenía", async () => {
    const base = semillaTenant("gerente");
    const semilla = {
      ...base,
      membership: base.membership.map((m) =>
        m.id === M2 ? { ...m, portales: ["erp", "cliente"] } : m,
      ),
    };
    const { ctx } = contextoDePrueba({ rol: "owner", semilla });
    const r = await executeCapability(ctx, "core.users.update", { membershipId: M2, rol: "admin" });
    expect(r).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE", message: 'El rol "admin" no admite el portal "cliente".' },
    });
  });
  it("permite suspender una membresía histórica incoherente sin conceder acceso", async () => {
    const semilla = semillaTenant("viewer");
    semilla.membership[1]!.portales = ["cliente"];
    const { ctx } = contextoDePrueba({ rol: "owner", semilla });
    expect(
      await executeCapability(ctx, "core.users.update", { membershipId: M2, estado: "suspendida" }),
    ).toMatchObject({ ok: true });
    expect(
      await executeCapability(ctx, "core.users.update", { membershipId: M2, estado: "activa" }),
    ).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
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

  it("coherencia rol-portal (NÚCLEO-D1): no invita con el portal 'cliente'", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.users.invite", {
      email: "nuevo@prueba.cl",
      rol: "viewer",
      portales: ["erp", "cliente"],
    });
    expect(r).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE", message: 'El rol "viewer" no admite el portal "cliente".' },
    });
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
      portales: ["erp", "supervisor"],
      portalInicio: "supervisor",
    });
    const token = base.correos.at(-1)?.texto.match(/invitacion\/gard\/(\S+)/)?.[1] ?? "";
    base.tabla("user").push({
      id: "0192f3a0-0000-7000-8000-0000000000c1",
      name: "Carla",
      email: "carla@prueba.cl",
    });
    // Excepción única (t500u): aceptar crea la membresía, aun sin portal ni acceso previo.
    base.ctx.portal = null;
    base.ctx.portalesMembresia = [];
    base.ctx.rol = null;
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
    expect(
      base.tabla("membership").find((m) => m["userId"] === base.ctx.usuario?.id)?.["portalInicio"],
    ).toBe("supervisor");
    const otraVez = await executeCapability(base.ctx, "core.invitations.accept", { token });
    expect(otraVez).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});

// CAR-803 · sello usersManage en evento, sin auto-acceso agente/API, vínculo por invitación con personaId.
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { PERMISOS_CORE } from "@opai/domain";
import { USUARIO_DE_PRUEBA, contextoDePrueba } from "../src/testing/contexto";
import {
  consumidorAccesoPortalTrabajador,
  consumidorVinculoPortalTrabajador,
} from "../src/core/maestros/consumidor-acceso-portal";
import { CLAVE_SELLO_USERS_MANAGE } from "../src/core/maestros/personas-acceso-portal-actor";
import { asegurarAccesoPortalTrabajador } from "../src/core/maestros/personas-acceso-portal";
import { vincularPersonaUsuario } from "../src/core/maestros/personas-acceso-logica";
import {
  contextoDespachoSistema,
  eventoPrueba,
  personaActiva,
  usuarioActor,
  viewerTrabajador,
} from "./personas-acceso-portal-seguridad-ayuda";

const payloadActivo = (sello: boolean) => ({
  hacia: "activo",
  [CLAVE_SELLO_USERS_MANAGE]: sello,
});

describe("portal trabajador · seguridad de acceso automático", () => {
  it("actor usuario sin sello en evento: no auto-acceso", async () => {
    const { ctx, tabla } = contextoDespachoSistema();
    const actorViewer = await usuarioActor(ctx, "viewer");
    const personaId = await personaActiva(ctx, { rut: "11.111.111-1", email: "victima@prueba.cl" });
    await consumidorAccesoPortalTrabajador.handler(
      ctx,
      eventoPrueba("core.persona.estado_cambiado", {
        entidadId: personaId,
        entidadTipo: "persona",
        actorTipo: "user",
        actorId: actorViewer,
        payload: payloadActivo(false),
      }),
    );
    expect(tabla("invitation")).toHaveLength(0);
    expect(
      tabla("bitacora").some((f) => String(f["payloadCanon"]).includes("sin_users_manage")),
    ).toBe(true);
  });

  it("actor agente con sello forjado: no auto-acceso (actor_no_usuario_humano)", async () => {
    const { ctx, tabla } = contextoDespachoSistema();
    const personaId = await personaActiva(ctx, { rut: "12.121.212-1", email: "agente@prueba.cl" });
    await consumidorAccesoPortalTrabajador.handler(
      ctx,
      eventoPrueba("core.persona.estado_cambiado", {
        entidadId: personaId,
        entidadTipo: "persona",
        actorTipo: "agent",
        actorId: "key-solo-personas",
        viaUserId: USUARIO_DE_PRUEBA.id,
        payload: payloadActivo(true),
      }),
    );
    expect(tabla("invitation")).toHaveLength(0);
    expect(
      tabla("bitacora").some((f) => String(f["payloadCanon"]).includes("actor_no_usuario_humano")),
    ).toBe(true);
  });

  it("actor usuario con sello verdadero: asegura acceso", async () => {
    const { ctx, tabla } = contextoDespachoSistema();
    const actorOwner = await usuarioActor(ctx, "owner");
    const personaId = await personaActiva(ctx, { rut: "22.222.222-2", email: "nuevo@prueba.cl" });
    await consumidorAccesoPortalTrabajador.handler(
      ctx,
      eventoPrueba("core.persona.estado_cambiado", {
        entidadId: personaId,
        entidadTipo: "persona",
        actorTipo: "user",
        actorId: actorOwner,
        payload: payloadActivo(true),
      }),
    );
    expect(tabla("invitation").length + (tabla("persona").find((f) => f["id"] === personaId)?.["usuarioId"] ? 1 : 0)).toBeGreaterThan(0);
  });

  it("vincula solo si la invitación aceptada tenía personaId y sello del invitador", async () => {
    const { ctx, tabla } = contextoDespachoSistema();
    const ownerId = await usuarioActor(ctx, "owner");
    const otra = await personaActiva(ctx, { rut: "55.555.555-5", email: "dup@prueba.cl" });
    const objetivo = await personaActiva(ctx, { rut: "66.666.666-6", email: "otro-correo@prueba.cl" });
    const userId = await viewerTrabajador(ctx, "dup@prueba.cl");
    const invId = randomUUID();
    await ctx.db.invitation.create({
      data: {
        id: invId,
        tenantId: ctx.tenantId,
        email: "dup@prueba.cl",
        rol: "viewer",
        portales: ["trabajador"],
        tokenHash: randomUUID(),
        invitedByUserId: ownerId,
        expiresAt: new Date(Date.now() + 60_000),
        acceptedAt: new Date(),
        personaId: objetivo,
        autoAccesoUsersManage: true,
      },
    });
    await consumidorVinculoPortalTrabajador.handler(
      ctx,
      eventoPrueba("core.membresia.creada", {
        actorTipo: "user",
        actorId: userId,
        payload: { usuarioId: userId, invitationId: invId },
      }),
    );
    expect(tabla("persona").find((f) => f["id"] === objetivo)?.["usuarioId"]).toBe(userId);
    expect(tabla("persona").find((f) => f["id"] === otra)?.["usuarioId"] ?? null).toBeNull();
  });

  it("membresia.creada sin invitationId: no vincula", async () => {
    const { ctx, tabla } = contextoDespachoSistema();
    const personaId = await personaActiva(ctx, { rut: "77.777.777-7", email: "sin-inv@prueba.cl" });
    const userId = await viewerTrabajador(ctx, "sin-inv@prueba.cl");
    await consumidorVinculoPortalTrabajador.handler(
      ctx,
      eventoPrueba("core.membresia.creada", {
        payload: { usuarioId: userId },
      }),
    );
    expect(tabla("persona").find((f) => f["id"] === personaId)?.["usuarioId"] ?? null).toBeNull();
  });

  it("no sobrescribe usuarioId (asegurar acceso y vincular)", async () => {
    const otro = randomUUID();
    const trabajador = randomUUID();
    const personaId = randomUUID();
    const { ctx, tabla } = contextoDePrueba({
      permisos: [PERMISOS_CORE.usersManage, PERMISOS_CORE.personasManage],
      modulosActivos: ["portal_trabajador"],
    });
    await ctx.db.user.create({ data: { id: otro, name: "Dueño", email: "dueno@prueba.cl", emailVerified: true } });
    await ctx.db.user.create({
      data: { id: trabajador, name: "Trab", email: "nuevo@prueba.cl", emailVerified: true },
    });
    await ctx.db.membership.create({
      data: { tenantId: ctx.tenantId, userId: trabajador, rol: "viewer", portales: ["trabajador"], estado: "activa" },
    });
    await personaActiva(ctx, { id: personaId, rut: "33.333.333-3", email: "nuevo@prueba.cl", usuarioId: otro });
    expect(await asegurarAccesoPortalTrabajador(ctx, personaId, false, true)).toMatchObject({
      estado: "no_aplica",
      motivo: "persona_ya_vinculada",
    });
    await expect(vincularPersonaUsuario(ctx, personaId, trabajador, false)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(tabla("persona").find((f) => f["id"] === personaId)?.["usuarioId"]).toBe(otro);
  });
});
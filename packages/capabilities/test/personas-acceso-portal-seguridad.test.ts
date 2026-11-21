// CAR-803 · bloqueos del Revisor: usersManage en consumidor, vínculo sin sobrescribir, correo ambiguo.
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { PERMISOS_CORE } from "@opai/domain";
import { contextoDePrueba } from "../src/testing/contexto";
import {
  consumidorAccesoPortalTrabajador,
  consumidorVinculoPortalTrabajador,
} from "../src/core/maestros/consumidor-acceso-portal";
import { asegurarAccesoPortalTrabajador } from "../src/core/maestros/personas-acceso-portal";
import { vincularPersonaUsuario } from "../src/core/maestros/personas-acceso-logica";
import {
  contextoDespachoSistema,
  eventoPrueba,
  personaActiva,
  usuarioActor,
  viewerTrabajador,
} from "./personas-acceso-portal-seguridad-ayuda";

describe("portal trabajador · seguridad de acceso automático", () => {
  it("ctx sistema + actor sin usersManage: no invita/vincula y registra omisión", async () => {
    const { ctx, tabla } = contextoDespachoSistema();
    const actorViewer = await usuarioActor(ctx, "viewer");
    const personaId = await personaActiva(ctx, { rut: "11.111.111-1", email: "victima@prueba.cl" });
  const userId = await viewerTrabajador(ctx, "victima@prueba.cl");
    await consumidorAccesoPortalTrabajador.handler(
      ctx,
      eventoPrueba("core.persona.estado_cambiado", {
        entidadId: personaId,
        entidadTipo: "persona",
        actorTipo: "user",
        actorId: actorViewer,
        payload: { hacia: "activo" },
      }),
    );
    await consumidorVinculoPortalTrabajador.handler(
      ctx,
      eventoPrueba("core.membresia.creada", {
        actorTipo: "user",
        actorId: actorViewer,
        payload: { usuarioId: userId },
      }),
    );
    expect(tabla("invitation")).toHaveLength(0);
    expect(tabla("persona").find((f) => f["id"] === personaId)?.["usuarioId"] ?? null).toBeNull();
    expect(tabla("bitacora").map((f) => f["tipo"])).toContain("core.personas.acceso_portal_omitido");
  });

  it("ctx sistema + actor con usersManage: sí asegura acceso", async () => {
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
        payload: { hacia: "activo" },
      }),
    );
    expect(tabla("invitation").length + (tabla("persona").find((f) => f["id"] === personaId)?.["usuarioId"] ? 1 : 0)).toBeGreaterThan(0);
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
    expect(await asegurarAccesoPortalTrabajador(ctx, personaId, false)).toMatchObject({
      estado: "no_aplica",
      motivo: "persona_ya_vinculada",
    });
    await expect(vincularPersonaUsuario(ctx, personaId, trabajador, false)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(tabla("persona").find((f) => f["id"] === personaId)?.["usuarioId"]).toBe(otro);
  });

  it("correo duplicado en dos personas: vínculo automático ambiguo", async () => {
    const { ctx, tabla } = contextoDespachoSistema();
    const actorOwner = await usuarioActor(ctx, "owner");
    const userId = await viewerTrabajador(ctx, "dup@prueba.cl");
    for (const rut of ["55.555.555-5", "66.666.666-6"])
      await personaActiva(ctx, { rut, email: "dup@prueba.cl", usuarioId: null });
    await consumidorVinculoPortalTrabajador.handler(
      ctx,
      eventoPrueba("core.membresia.creada", {
        actorTipo: "user",
        actorId: actorOwner,
        payload: { usuarioId: userId },
      }),
    );
    expect(tabla("persona").every((f) => f["usuarioId"] == null)).toBe(true);
  });

  it("correo de usuario sin verificar: no vincula por email", async () => {
    const { ctx, tabla } = contextoDespachoSistema();
    const actorOwner = await usuarioActor(ctx, "owner");
    const userId = await viewerTrabajador(ctx, "noverif@prueba.cl", ["trabajador"], false);
    await personaActiva(ctx, { rut: "77.777.777-7", email: "noverif@prueba.cl" });
    await consumidorVinculoPortalTrabajador.handler(
      ctx,
      eventoPrueba("core.membresia.creada", {
        actorTipo: "user",
        actorId: actorOwner,
        payload: { usuarioId: userId },
      }),
    );
    expect(tabla("persona").every((f) => f["usuarioId"] == null)).toBe(true);
  });
});
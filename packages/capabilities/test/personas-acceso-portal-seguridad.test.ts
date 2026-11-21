// CAR-803 · bloqueos del Revisor: usersManage en consumidor, vínculo sin sobrescribir, correo ambiguo.
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { PERMISOS_CORE } from "@opai/domain";
import { contextoDePrueba } from "../src/testing/contexto";
import type { EventoPublicado } from "../src/eventos/consumidores";
import {
  consumidorAccesoPortalTrabajador,
  consumidorVinculoPortalTrabajador,
} from "../src/core/maestros/consumidor-acceso-portal";
import { asegurarAccesoPortalTrabajador } from "../src/core/maestros/personas-acceso-portal";
import { vincularPersonaUsuario } from "../src/core/maestros/personas-acceso-logica";
import { personaActiva, viewerTrabajador } from "./personas-acceso-portal-seguridad-ayuda";

const evActivo = (personaId: string) =>
  ({ id: "ev", tipo: "core.persona.estado_cambiado", entidadId: personaId, payload: { hacia: "activo" } }) as EventoPublicado;
const evMembresia = (usuarioId: string) =>
  ({ id: "ev", tipo: "core.membresia.creada", payload: { usuarioId } }) as EventoPublicado;
const soloPersonas = { permisos: [PERMISOS_CORE.personasManage], modulosActivos: ["portal_trabajador"] as const };

describe("portal trabajador · seguridad de acceso automático", () => {
  it("sin usersManage los consumidores no invitan ni vinculan", async () => {
    const { ctx, tabla } = contextoDePrueba(soloPersonas);
    const personaId = await personaActiva(ctx, { rut: "11.111.111-1", email: "victima@prueba.cl" });
    const userId = await viewerTrabajador(ctx, "victima@prueba.cl");
    await consumidorAccesoPortalTrabajador.handler(ctx, evActivo(personaId));
    await consumidorVinculoPortalTrabajador.handler(ctx, evMembresia(userId));
    expect(tabla("invitation")).toHaveLength(0);
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
    await ctx.db.user.create({ data: { id: otro, name: "Dueño", email: "dueno@prueba.cl" } });
    await ctx.db.user.create({ data: { id: trabajador, name: "Trab", email: "nuevo@prueba.cl" } });
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
    const { ctx, tabla } = contextoDePrueba({
      permisos: [PERMISOS_CORE.usersManage, PERMISOS_CORE.personasManage],
      modulosActivos: ["portal_trabajador"],
    });
    const userId = await viewerTrabajador(ctx, "dup@prueba.cl");
    for (const rut of ["55.555.555-5", "66.666.666-6"])
      await personaActiva(ctx, { rut, email: "dup@prueba.cl", usuarioId: null });
    await consumidorVinculoPortalTrabajador.handler(ctx, evMembresia(userId));
    expect(tabla("persona").every((f) => f["usuarioId"] == null)).toBe(true);
  });
});
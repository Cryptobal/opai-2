import { z } from "zod";

import { esMembresiaPortalTrabajador, type Rol } from "@opai/domain";

import { defineConsumidor, type EventoPublicado } from "../../eventos/consumidores";
import type { Contexto } from "../../types";
import { vincularPersonaUsuario } from "./personas-acceso-logica";
import { asegurarAccesoPortalTrabajador } from "./personas-acceso-portal";
import {
  autoAccesoPermitidoPorEvento,
  motivoOmisionAutoAcceso,
  registrarOmisionAccesoPortal,
} from "./personas-acceso-portal-actor";

async function vincularTrasAceptarInvitacion(ctx: Contexto, ev: EventoPublicado, usuarioId: string) {
  const raw = (ev.payload as { invitationId?: unknown } | null)?.invitationId;
  const invitationId = z.uuid().safeParse(raw);
  if (!invitationId.success) {
    await registrarOmisionAccesoPortal(ctx, ev, "sin_invitacion", { usuarioId });
    return;
  }
  const inv = await ctx.db.invitation.findFirst({
    where: { id: invitationId.data, tenantId: ctx.tenantId },
    select: { personaId: true, autoAccesoUsersManage: true },
  });
  if (!inv?.personaId || inv.autoAccesoUsersManage !== true) {
    await registrarOmisionAccesoPortal(ctx, ev, "invitacion_sin_vinculo_portal", {
      invitationId: invitationId.data,
      usuarioId,
    });
    return;
  }
  const m = await ctx.db.membership.findFirst({
    where: { userId: usuarioId, tenantId: ctx.tenantId, estado: "activa" },
    select: { rol: true, portales: true },
  });
  if (!m || !esMembresiaPortalTrabajador(m.rol as Rol, m.portales)) return;
  try {
    await vincularPersonaUsuario(ctx, inv.personaId, usuarioId, false);
  } catch {
    await registrarOmisionAccesoPortal(ctx, ev, "persona_ya_vinculada", {
      personaId: inv.personaId,
      usuarioId,
    });
  }
}

export const consumidorAccesoPortalTrabajador = defineConsumidor({
  id: "core.personas.acceso_portal_al_activar",
  descripcion:
    "Al activar una persona, asegura su acceso al portal del trabajador si el módulo está encendido.",
  eventos: ["core.persona.estado_cambiado"],
  async handler(ctx, ev) {
    const p = ev.payload as { hacia?: unknown } | null;
    if (p?.hacia !== "activo" || !ev.entidadId) return;
    if (!autoAccesoPermitidoPorEvento(ev)) {
      await registrarOmisionAccesoPortal(ctx, ev, motivoOmisionAutoAcceso(ev), {
        personaId: ev.entidadId,
      });
      return;
    }
    await asegurarAccesoPortalTrabajador(ctx, ev.entidadId, false, true);
  },
});

export const consumidorVinculoPortalTrabajador = defineConsumidor({
  id: "core.personas.vincular_al_alta_portal",
  descripcion:
    "Al aceptarse una invitación del portal trabajador, vincula la persona indicada en la invitación.",
  eventos: ["core.membresia.creada"],
  async handler(ctx, ev) {
    const usuarioId = z.uuid().safeParse((ev.payload as { usuarioId?: unknown } | null)?.usuarioId);
    if (!usuarioId.success) return;
    await vincularTrasAceptarInvitacion(ctx, ev, usuarioId.data);
  },
});
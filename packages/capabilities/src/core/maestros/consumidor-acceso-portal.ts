import { z } from "zod";

import { esMembresiaPortalTrabajador, PERMISOS_CORE, type Rol } from "@opai/domain";

import { defineConsumidor } from "../../eventos/consumidores";
import type { Contexto } from "../../types";
import { asegurarAccesoPortalTrabajador } from "./personas-acceso-portal";

async function vincularPorEmail(ctx: Contexto, usuarioId: string) {
  const usuario = await ctx.db.user.findUnique({ where: { id: usuarioId }, select: { email: true } });
  if (!usuario) return;
  const m = await ctx.db.membership.findFirst({
    where: { userId: usuarioId, estado: "activa" },
    select: { rol: true, portales: true },
  });
  if (!m || !esMembresiaPortalTrabajador(m.rol as Rol, m.portales)) return;
  if (!ctx.autorizar(PERMISOS_CORE.usersManage)) return;
  const email = usuario.email.toLowerCase();
  const candidatas = await ctx.db.persona.findMany({
    where: {
      archivadaEn: null,
      anonimizadaEn: null,
      usuarioId: null,
      OR: [
        { emailLaboral: { equals: email, mode: "insensitive" } },
        { emailPersonal: { equals: email, mode: "insensitive" } },
      ],
    },
    select: { id: true },
    take: 2,
  });
  if (candidatas.length !== 1) return;
  const personaId = candidatas[0]!.id;
  await ctx.transaccion((tx) =>
    tx.persona.updateMany({ where: { id: personaId, usuarioId: null }, data: { usuarioId } }),
  );
}

export const consumidorAccesoPortalTrabajador = defineConsumidor({
  id: "core.personas.acceso_portal_al_activar",
  descripcion:
    "Al activar una persona, asegura su acceso al portal del trabajador si el módulo está encendido.",
  eventos: ["core.persona.estado_cambiado"],
  async handler(ctx, ev) {
    const p = ev.payload as { hacia?: unknown } | null;
    if (p?.hacia !== "activo" || !ev.entidadId) return;
    if (!ctx.autorizar(PERMISOS_CORE.usersManage)) return;
    await asegurarAccesoPortalTrabajador(ctx, ev.entidadId, false);
  },
});

export const consumidorVinculoPortalTrabajador = defineConsumidor({
  id: "core.personas.vincular_al_alta_portal",
  descripcion:
    "Al crearse una membresía de portal trabajador, vincula la persona con el mismo correo si aún no tiene usuario.",
  eventos: ["core.membresia.creada"],
  async handler(ctx, ev) {
    const usuarioId = z.uuid().safeParse((ev.payload as { usuarioId?: unknown } | null)?.usuarioId);
    if (!usuarioId.success) return;
    await vincularPorEmail(ctx, usuarioId.data);
  },
});
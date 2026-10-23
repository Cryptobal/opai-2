import { z } from "zod";

import { defineCapability } from "../define";
import { conflicto, noEncontrado, prohibido, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { tenantActual } from "./comun";
import { estadoInvitacion, invitacionPorToken } from "./invitar";

// Flujo de invitación (página /invitacion/<slug>/<token>). Capacidades internas: las usa la UI
// del núcleo con el tenant del enlace; no se exponen por API ni MCP.

const token = z.object({ token: z.string().min(20).max(200) });

async function cargar(ctx: Contexto, t: string) {
  const invitacion = await invitacionPorToken(ctx.db, t);
  if (!invitacion) throw noEncontrado("La invitación");
  return invitacion;
}

export const invitationsPeek = defineCapability({
  id: "core.invitations.peek",
  descripcion: "Muestra empresa, rol y estado de una invitación a partir del token del enlace.",
  permiso: null,
  interna: true,
  input: token,
  output: z.object({
    tenant: z.string(),
    email: z.string(),
    rol: z.string(),
    estado: z.string(),
    usuarioExiste: z.boolean(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const i = await cargar(ctx, input.token);
    const tenant = await tenantActual(ctx);
    const usuario = await ctx.db.user.findUnique({ where: { email: i.email } });
    return {
      tenant: tenant.nombre,
      email: i.email,
      rol: i.rol,
      estado: estadoInvitacion(i),
      usuarioExiste: Boolean(usuario),
    };
  },
});

export const invitationsAccept = defineCapability({
  id: "core.invitations.accept",
  descripcion:
    "Acepta una invitación: crea la membresía del usuario autenticado con el rol invitado.",
  permiso: null,
  interna: true,
  input: token,
  output: z.object({ tenantId: z.string(), membershipId: z.string().nullable(), rol: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (ctx.actor.tipo !== "user" || !ctx.usuario) throw prohibido("Inicia sesión para aceptar.");
    const i = await cargar(ctx, input.token);
    if (estadoInvitacion(i) !== "pendiente") throw reglaDeNegocio("La invitación ya no es válida.");
    if (i.email !== ctx.usuario.email.toLowerCase()) {
      throw prohibido(`La invitación es para ${i.email}. Entra con ese correo.`);
    }
    const ya = await ctx.db.membership.findUnique({
      where: { tenantId_userId: { tenantId: i.tenantId, userId: ctx.usuario.id } },
    });
    if (ya) throw conflicto("Ya perteneces a esta empresa.");
    if (dryRun) return { tenantId: i.tenantId, membershipId: null, rol: i.rol };
    const m = await ctx.db.membership.create({
      data: { tenantId: i.tenantId, userId: ctx.usuario.id, rol: i.rol, portales: i.portales },
    });
    await ctx.db.invitation.update({ where: { id: i.id }, data: { acceptedAt: new Date() } });
    return { tenantId: i.tenantId, membershipId: m.id, rol: m.rol };
  },
});

export const invitationsRequestNew = defineCapability({
  id: "core.invitations.request_new",
  descripcion:
    "Pide una invitación nueva al administrador que envió una invitación vencida o usada.",
  permiso: null,
  interna: true,
  input: token,
  output: z.object({ enviado: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const i = await cargar(ctx, input.token);
    const admin = await ctx.db.user.findUnique({ where: { id: i.invitedByUserId } });
    if (!admin) return { enviado: false };
    if (!dryRun) {
      const tenant = await tenantActual(ctx);
      await ctx.servicios.correo.enviar({
        para: admin.email,
        asunto: `${i.email} pide una nueva invitación a ${tenant.nombre}`,
        texto: `La invitación de ${i.email} a ${tenant.nombre} venció o ya se usó. Envía una nueva desde Configuración → Usuarios:\n${ctx.servicios.urlBase}/configuracion/usuarios\n`,
      });
    }
    return { enviado: true };
  },
});

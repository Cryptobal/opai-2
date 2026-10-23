import { z } from "zod";

import { defineCapability } from "../define";
import { conflicto, noEncontrado, prohibido, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { tenantActual } from "./comun";
import { enviarCorreo } from "./comunicaciones/envio";
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
  // Interna: la invitación se mira antes de existir sesión (el token del enlace es la credencial), así que no puede llevar permiso ni exponerse como herramienta MCP.
  interna: true,
  input: token,
  output: z.object({
    tenant: z.string(),
    email: z.string(),
    rol: z.string(),
    estado: z.string(),
    usuarioExiste: z.boolean(),
    /** Nombre de la cuenta existente con ese correo (variante "correo con cuenta"). */
    nombreUsuario: z.string().nullable(),
    invitadoPor: z.string().nullable(),
    expiresAt: z.string(),
    acceptedAt: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const i = await cargar(ctx, input.token);
    const tenant = await tenantActual(ctx);
    const [usuario, invita] = await Promise.all([
      ctx.db.user.findUnique({ where: { email: i.email } }),
      ctx.db.user.findUnique({ where: { id: i.invitedByUserId } }),
    ]);
    return {
      tenant: tenant.nombre,
      email: i.email,
      rol: i.rol,
      estado: estadoInvitacion(i),
      usuarioExiste: Boolean(usuario),
      nombreUsuario: usuario?.name ?? null,
      invitadoPor: invita?.name ?? null,
      expiresAt: i.expiresAt.toISOString(),
      acceptedAt: i.acceptedAt?.toISOString() ?? null,
    };
  },
});

export const invitationsAccept = defineCapability({
  id: "core.invitations.accept",
  descripcion:
    "Acepta una invitación: crea la membresía del usuario autenticado con el rol invitado.",
  permiso: null,
  // Interna: se ejecuta al aceptar el enlace, antes de que exista la membresía; un agente no acepta invitaciones por nadie.
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
  // Interna: la pide quien aún no tiene sesión (token vencido o usado); no tiene permiso que verificar ni sentido para un agente.
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
      await enviarCorreo(
        {
          db: ctx.db,
          tenantId: ctx.tenantId,
          correo: ctx.servicios.correo,
          urlBase: ctx.servicios.urlBase,
        },
        "core.usuario.invitacion_solicitada",
        admin.email,
        {
          email: i.email,
          empresa: { nombre: tenant.nombre },
          url: `${ctx.servicios.urlBase}/configuracion/usuarios`,
        },
      );
    }
    return { enviado: true };
  },
});

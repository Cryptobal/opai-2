import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { tenantActual, usuarioResponsable } from "./comun";
import { emailSchema, portalSchema, rolSchema, uuidSchema } from "./esquemas";
import { crearInvitacion, estadoInvitacion } from "./invitar";
import { validarConcedeRol } from "./permisos/comun";

export const invitacionCreadaSchema = z.object({
  id: z.string().nullable(),
  email: z.string(),
  rol: z.string(),
  portales: z.array(z.string()),
  expiresAt: z.string(),
  usuarioExiste: z.boolean(),
});

export const usersInvite = defineCapability({
  id: "core.users.invite",
  descripcion:
    "Invita a una persona por correo con un rol y portales. Envía un enlace de un solo uso (72 h).",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({
    email: emailSchema,
    rol: rolSchema,
    portales: z.array(portalSchema).min(1).default(["erp"]),
  }),
  output: invitacionCreadaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    // Qué rol puede invitar se mide por su acceso REAL (§16.2, ADR-022), no por el rol base: nadie
    // invita con un rol que concede permisos que él mismo no tiene (owner solo lo invita un owner).
    validarConcedeRol(ctx, input.rol);
    const tenant = await tenantActual(ctx);
    const invitadoPor = { id: usuarioResponsable(ctx), nombre: ctx.usuario?.nombre ?? "OPAI" };
    return crearInvitacion(ctx.db, tenant, { ...input, invitadoPor }, ctx.servicios, dryRun);
  },
});

const invitacionSchema = z.object({
  id: z.string(),
  email: z.string(),
  rol: z.string(),
  portales: z.array(z.string()),
  estado: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
});

export const invitationsList = defineCapability({
  id: "core.invitations.list",
  descripcion:
    "Invitaciones de la empresa actual con su estado (pendiente, aceptada, revocada, vencida).",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({ soloPendientes: z.boolean().default(true) }),
  output: z.array(invitacionSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.invitation.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return filas
      .map((i) => ({ ...i, estado: estadoInvitacion(i) }))
      .filter((i) => !input.soloPendientes || i.estado === "pendiente");
  },
});

export const invitationsRevoke = defineCapability({
  id: "core.invitations.revoke",
  descripcion: "Revoca una invitación pendiente: su enlace deja de servir.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({ invitationId: uuidSchema }),
  output: z.object({ id: z.string(), revocada: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const i = await ctx.db.invitation.findUnique({ where: { id: input.invitationId } });
    if (!i) throw noEncontrado("La invitación");
    if (estadoInvitacion(i) !== "pendiente") return { id: i.id, revocada: false };
    if (!dryRun) {
      await ctx.db.invitation.update({ where: { id: i.id }, data: { revocadaEn: new Date() } });
    }
    return { id: i.id, revocada: true };
  },
});

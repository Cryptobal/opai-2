import { z } from "zod";

import { esMembresiaPortalTrabajador, PERMISOS_CORE, type Rol } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { personaDe } from "./personas-vista";
import { correoPortalPersona } from "./personas-acceso-logica";
import type { Contexto } from "../../types";

const estadoFichaSchema = z.enum([
  "sin_correo",
  "invitacion_pendiente",
  "sin_acceso",
  "activo",
  "pin_creado",
  "no_disponible",
]);

async function estadoEnFicha(ctx: Contexto, personaId: string) {
  if (!ctx.modulosActivos.includes("portal_trabajador")) {
    return { personaId, estado: "no_disponible" as const, motivo: "portal_trabajador_apagado" };
  }
  const p = await personaDe(ctx, personaId);
  const email = correoPortalPersona(p);
  if (!email) return { personaId, estado: "sin_correo" as const };
  const usuario = await ctx.db.user.findUnique({ where: { email } });
  const m = usuario
    ? await ctx.db.membership.findFirst({
        where: { userId: usuario.id },
        select: { id: true, rol: true, portales: true, estado: true },
      })
    : null;
  if (m) {
    if (m.estado !== "activa" || !esMembresiaPortalTrabajador(m.rol as Rol, m.portales)) {
      return { personaId, estado: "no_disponible" as const, motivo: "usuario_interno" };
    }
    if (p.usuarioId !== usuario?.id) {
      return { personaId, estado: "sin_acceso" as const };
    }
    const pin = await ctx.db.credencialTerreno.findUnique({ where: { personaId }, select: { id: true } });
    return { personaId, estado: pin ? ("pin_creado" as const) : ("activo" as const) };
  }
  const pendiente = await ctx.db.invitation.findFirst({
    where: { email, acceptedAt: null, revocadaEn: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (pendiente) return { personaId, estado: "invitacion_pendiente" as const };
  return { personaId, estado: "sin_acceso" as const };
}

export const personasAccesoEstado = defineCapability({
  id: "core.personas.acceso_estado",
  descripcion:
    "Estado del acceso al portal del trabajador en la ficha de una persona (sin correo, invitación pendiente, activo, PIN creado, etc.). Nunca muestra el PIN.",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ personaId: uuidSchema }),
  output: z.object({
    personaId: z.string(),
    estado: estadoFichaSchema,
    motivo: z.string().optional(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.personaId],
  handler: (ctx, { personaId }) => estadoEnFicha(ctx, personaId),
});
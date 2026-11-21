import { tenantActual } from "../comun";
import { crearInvitacion } from "../invitar";
import type { Contexto } from "../../types";
import {
  ampliarPortalesTrabajador,
  correoPortalPersona,
  esInternoParaPortalTrabajador,
  invitadorDe,
  portalesInvitacionTrabajador,
  vincularPersonaUsuario,
} from "./personas-acceso-logica";

export type EstadoAccesoPortalTrabajador =
  | "ya_tiene_acceso"
  | "vinculado"
  | "invitado"
  | "invitacion_pendiente"
  | "sin_correo"
  | "no_aplica";

export type ResultadoAccesoPortalTrabajador = { estado: EstadoAccesoPortalTrabajador; motivo?: string };

const no = (motivo: string): ResultadoAccesoPortalTrabajador => ({ estado: "no_aplica", motivo });

export async function asegurarAccesoPortalTrabajador(
  ctx: Contexto,
  personaId: string,
  dryRun: boolean,
): Promise<ResultadoAccesoPortalTrabajador> {
  if (!ctx.modulosActivos.includes("portal_trabajador")) return no("portal_trabajador_apagado");
  const persona = await ctx.db.persona.findFirst({
    where: { id: personaId, archivadaEn: null, anonimizadaEn: null },
    select: {
      id: true,
      estado: true,
      emailLaboral: true,
      emailPersonal: true,
      usuarioId: true,
      archivadaEn: true,
      anonimizadaEn: true,
    },
  });
  if (!persona || persona.estado !== "activo") return no("persona_no_vigente");
  const email = correoPortalPersona(persona);
  if (!email) return { estado: "sin_correo" };

  const usuario = await ctx.db.user.findUnique({ where: { email } });
  const m = usuario
    ? await ctx.db.membership.findFirst({
        where: { userId: usuario.id, estado: "activa" },
        select: { id: true, rol: true, portales: true, userId: true },
      })
    : null;

  if (m) {
    if (esInternoParaPortalTrabajador(m.rol, m.portales)) return no("usuario_interno");
    const ya = persona.usuarioId === m.userId;
    if (!m.portales.includes("trabajador")) await ampliarPortalesTrabajador(ctx, m.id, dryRun);
    if (!ya) await vincularPersonaUsuario(ctx, persona.id, m.userId, dryRun);
    return { estado: ya ? "ya_tiene_acceso" : "vinculado" };
  }

  const pendiente = await ctx.db.invitation.findFirst({
    where: { email, acceptedAt: null, revocadaEn: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (pendiente) return { estado: "invitacion_pendiente" };

  const tenant = await tenantActual(ctx);
  const invitadoPor = await invitadorDe(ctx);
  await crearInvitacion(
    ctx.db,
    tenant,
    {
      email,
      rol: "viewer",
      portales: portalesInvitacionTrabajador(ctx),
      portalInicio: "trabajador",
      invitadoPor,
    },
    ctx.servicios,
    dryRun,
  );
  return { estado: "invitado" };
}
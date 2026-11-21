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

type EstadoAccesoPortalTrabajador =
  | "ya_tiene_acceso"
  | "vinculado"
  | "invitado"
  | "invitacion_pendiente"
  | "sin_correo"
  | "no_aplica";

export type ResultadoAccesoPortalTrabajador = { estado: EstadoAccesoPortalTrabajador; motivo?: string };

const no = (motivo: string): ResultadoAccesoPortalTrabajador => ({ estado: "no_aplica", motivo });

type MembresiaTrabajador = { id: string; rol: string; portales: string[]; userId: string };

async function accesoConUsuarioExistente(
  ctx: Contexto,
  persona: { id: string; usuarioId: string | null },
  m: MembresiaTrabajador,
  dryRun: boolean,
): Promise<ResultadoAccesoPortalTrabajador> {
  if (esInternoParaPortalTrabajador(m.rol, m.portales)) return no("usuario_interno");
  if (persona.usuarioId && persona.usuarioId !== m.userId) return no("persona_ya_vinculada");
  if (persona.usuarioId === m.userId) {
    if (!m.portales.includes("trabajador")) await ampliarPortalesTrabajador(ctx, m.id, dryRun);
    return { estado: "ya_tiene_acceso" };
  }
  await vincularPersonaUsuario(ctx, persona.id, m.userId, dryRun);
  return { estado: "vinculado" };
}

async function invitarSiNoHayUsuario(
  ctx: Contexto,
  email: string,
  dryRun: boolean,
): Promise<ResultadoAccesoPortalTrabajador> {
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

  const usuario = await ctx.db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, emailVerified: true },
    select: { id: true },
  });
  const m = usuario
    ? await ctx.db.membership.findFirst({
        where: { userId: usuario.id, estado: "activa" },
        select: { id: true, rol: true, portales: true, userId: true },
      })
    : null;

  if (m) return accesoConUsuarioExistente(ctx, persona, m, dryRun);
  return invitarSiNoHayUsuario(ctx, email, dryRun);
}
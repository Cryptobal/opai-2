import type { Rol } from "@opai/domain";
import type { TenantDb } from "@opai/db";

import { conflicto } from "../errores";
import type { Servicios } from "../types";
import { sha256, tokenAleatorio } from "./comun";

const VIGENCIA_MS = 72 * 60 * 60 * 1000;

export type DatosInvitacion = {
  email: string;
  rol: Rol;
  portales: readonly string[];
  invitadoPor: { id: string; nombre: string };
};

type TenantInvita = { id: string; slug: string; nombre: string };

/**
 * Crea una invitación (token de 32 bytes, solo su hash en base, 72 h, un uso) y envía el correo.
 * Una invitación pendiente al mismo correo se revoca. Si el correo ya es miembro, falla.
 * En vista previa no escribe ni envía.
 */
export async function crearInvitacion(
  db: TenantDb,
  tenant: TenantInvita,
  datos: DatosInvitacion,
  servicios: Servicios,
  dryRun: boolean,
) {
  const usuario = await db.user.findUnique({ where: { email: datos.email } });
  if (usuario) {
    const miembro = await db.membership.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: usuario.id } },
    });
    if (miembro) throw conflicto(`${datos.email} ya pertenece a ${tenant.nombre}.`);
  }
  const expiresAt = new Date(Date.now() + VIGENCIA_MS);
  const resumen = {
    email: datos.email,
    rol: datos.rol,
    portales: [...datos.portales],
    expiresAt: expiresAt.toISOString(),
    usuarioExiste: Boolean(usuario),
  };
  if (dryRun) return { id: null, ...resumen };

  const token = tokenAleatorio();
  await db.invitation.updateMany({
    where: { email: datos.email, acceptedAt: null, revocadaEn: null },
    data: { revocadaEn: new Date() },
  });
  const invitacion = await db.invitation.create({
    data: {
      tenantId: tenant.id,
      email: datos.email,
      rol: datos.rol,
      portales: [...datos.portales],
      tokenHash: sha256(token),
      invitedByUserId: datos.invitadoPor.id,
      expiresAt,
    },
  });
  const url = `${servicios.urlBase}/invitacion/${tenant.slug}/${token}`;
  await servicios.correo.enviar({
    para: datos.email,
    asunto: `${datos.invitadoPor.nombre} te invitó a ${tenant.nombre} en OPAI`,
    texto: `Hola:\n\n${datos.invitadoPor.nombre} te invitó a ${tenant.nombre} en OPAI con el rol ${datos.rol}.\n\nAcepta la invitación aquí (vence en 72 horas y sirve una sola vez):\n${url}\n`,
  });
  return { id: invitacion.id, ...resumen };
}

/** Busca una invitación por su token (hash) dentro del tenant. */
export async function invitacionPorToken(db: TenantDb, token: string) {
  return db.invitation.findUnique({ where: { tokenHash: sha256(token) } });
}

export function estadoInvitacion(i: {
  acceptedAt: Date | null;
  revocadaEn: Date | null;
  expiresAt: Date;
}): "pendiente" | "aceptada" | "revocada" | "vencida" {
  if (i.acceptedAt) return "aceptada";
  if (i.revocadaEn) return "revocada";
  return i.expiresAt.getTime() < Date.now() ? "vencida" : "pendiente";
}

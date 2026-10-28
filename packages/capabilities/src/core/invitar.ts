import type { Rol } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { conflicto } from "../errores";
import type { Servicios } from "../types";
import { sha256, tokenAleatorio } from "./comun";
import { enviarCorreo } from "./comunicaciones/envio";

const VIGENCIA_MS = 72 * 60 * 60 * 1000;

export type DatosInvitacion = {
  email: string;
  rol: Rol;
  portales: readonly string[];
  portalInicio?: string | null | undefined;
  invitadoPor: { id: string; nombre: string };
};

type TenantInvita = { id: string; slug: string; nombre: string };

/**
 * Crea una invitación (token de 32 bytes, solo su hash en base, 72 h, un uso) y envía el correo.
 * Una invitación pendiente al mismo correo se revoca. Si el correo ya es miembro, falla.
 * En vista previa no escribe ni envía.
 */
export async function crearInvitacion(
  db: TenantTx,
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
      portalInicio: datos.portalInicio ?? null,
      tokenHash: sha256(token),
      invitedByUserId: datos.invitadoPor.id,
      expiresAt,
    },
  });
  const url = `${servicios.urlBase}/invitacion/${tenant.slug}/${token}`;
  const enviado = await enviarCorreo(
    { db, tenantId: tenant.id, correo: servicios.correo, urlBase: servicios.urlBase },
    "core.usuario.invitado",
    datos.email,
    {
      invitador: { nombre: datos.invitadoPor.nombre },
      empresa: { nombre: tenant.nombre },
      rol: datos.rol,
      url,
    },
  );
  if (!enviado)
    throw new Error("No pudimos enviar el correo de invitación. Reintenta en unos minutos.");
  return { id: invitacion.id, ...resumen };
}

/** Busca una invitación por su token (hash) dentro del tenant. */
export async function invitacionPorToken(db: TenantTx, token: string) {
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

import type { TenantTx } from "./transaccion";

// Miembros e invitaciones de una empresa vistos desde Plataforma (CAR-323): operaciones con nombre y
// `select` acotado sobre `forTenant(tenantId)`; nunca el hash del token de una invitación.

const invitacion = {
  id: true,
  email: true,
  rol: true,
  portales: true,
  portalInicio: true,
  acceptedAt: true,
  revocadaEn: true,
  expiresAt: true,
  createdAt: true,
} as const;

export function operacionesMiembros(db: TenantTx) {
  return {
    /** Todos los miembros de la empresa (no solo owners y admins), con su rol, portales y estado. */
    miembros: () =>
      db.membership.findMany({
        orderBy: { createdAt: "asc" },
        take: 500,
        select: {
          id: true,
          rol: true,
          estado: true,
          portales: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
    invitacion: (id: string) => db.invitation.findFirst({ where: { id }, select: invitacion }),
    /** Revoca una invitación pendiente; devuelve si cambió algo. */
    revocarInvitacion: async (id: string) =>
      (
        await db.invitation.updateMany({
          where: { id, acceptedAt: null, revocadaEn: null },
          data: { revocadaEn: new Date() },
        })
      ).count === 1,
  };
}

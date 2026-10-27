/** Las lecturas de negocio no necesitan la cadena, nullable durante expand/contract. */
export const auditoriaSelect = {
  id: true,
  tenantId: true,
  actorType: true,
  actorId: true,
  viaUserId: true,
  capability: true,
  entityType: true,
  entityId: true,
  payload: true,
  createdAt: true,
} as const;

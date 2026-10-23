// Punto de entrada de @opai/db. El código de negocio solo necesita `forTenant` y los tipos.
export { cerrarClientes, dbAdmin } from "./client";
export { forTenant, validarTenantId, type TenantDb } from "./for-tenant";
export type { AuditEvent, Tenant } from "./generated/prisma/client";
export { Prisma } from "./generated/prisma/client";

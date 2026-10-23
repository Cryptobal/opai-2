// Punto de entrada de @opai/db. El código de negocio solo necesita `forTenant`, `enTransaccion` y los tipos.
export { cerrarClientes, dbAdmin } from "./client";
export { forTenant, validarTenantId, type TenantDb } from "./for-tenant";
export { forUser, type UserDb } from "./for-user";
export { clienteAuth, globales, listarTenants, tenantsOperables, type Globales } from "./globales";
export { enTransaccion, type OpcionesTransaccion, type TenantTx } from "./transaccion";
export type {
  ApiKey,
  AuditEvent,
  Invitation,
  Membership,
  Tenant,
  TenantModule,
  UsageEvent,
  User,
} from "./generated/prisma/client";
export { Prisma } from "./generated/prisma/client";

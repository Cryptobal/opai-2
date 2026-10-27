// Punto de entrada de @opai/db. El código de negocio solo necesita `forTenant`, `enTransaccion` y los tipos.
export { cerrarClientes, dbAdmin } from "./client";
export { registrarObservadorConsultas } from "./metricas";
export { forTenant, validarTenantId, type TenantDb } from "./for-tenant";
export { forUser, type UserDb } from "./for-user";
export { clienteAuth, tenantPorSlug, usuarioPorId, tenantsOperables } from "./globales";
export { accesoPlataforma, preciosHasta, type Globales } from "./plataforma";
export {
  agregarABitacora,
  type HechoBitacora,
  verificarBitacora,
  verificarEslabon,
  type VerificacionBitacora,
} from "./bitacora";
export {
  agregarAAuditoria,
  type HechoAuditoria,
  verificarAuditoria,
  type VerificacionAuditoria,
} from "./auditoria";
export { type ClienteCatalogo, sembrarCatalogo } from "./catalogo-tenant";
export { consolidarConsumos, RETENCION_CONSUMOS_DIAS } from "./consumos";
export { colaDeTrabajos, type ColaDeTrabajos, type TrabajoReclamado } from "./trabajos";
export { consumirRateLimit, purgarVentanasRateLimit, type ResultadoRateLimit } from "./rate-limit";
export { enTransaccion, type OpcionesTransaccion, type TenantTx } from "./transaccion";
export { consumirPresupuesto, periodoDeMes } from "./presupuesto";
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

// Punto de entrada de @opai/db. El código de negocio solo necesita `forTenant`, `enTransaccion` y los tipos.
export { cerrarClientes, dbAdmin } from "./client";
export { registrarObservadorConsultas } from "./metricas";
export { leerInbox } from "./inbox";
export { listarInstalaciones, type FiltroInstalaciones } from "./instalaciones-lista";
export { forTenant, validarTenantId, type TenantDb } from "./for-tenant";
export { forUser, type UserDb } from "./for-user";
export {
  clienteAuth,
  restablecerMfaDeUsuario,
  tenantPorSlug,
  tenantsOperables,
  ultimoAccesoDeUsuarios,
  usuarioPorId,
} from "./globales";
export { accesoPlataforma, preciosHasta, type Globales } from "./plataforma";
export type { HechoPlataforma } from "./plataforma-aprobaciones";
// La auditoría global solo se escribe por operaciones con nombre (`accesoPlataforma()` para
// `plataforma`, `registrarSeguridad()` para `seguridad`, CAR-42): no se exporta el append.
export type { AmbitoAuditoriaGlobal, HechoGlobal } from "./auditoria-global";
export { registrarSeguridad, type HechoSeguridad } from "./seguridad";
export {
  type FiltroTrabajos,
  operacionesEmpresa,
  type OperacionesEmpresa,
} from "./plataforma-empresa";
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
export { type ClienteComercial, sembrarComercial } from "./catalogo-comercial";
export { consolidarConsumos, RETENCION_CONSUMOS_DIAS } from "./consumos";
export { colaDeTrabajos, type ColaDeTrabajos, type TrabajoReclamado } from "./trabajos";
export {
  consumirRateLimit,
  hashIp,
  purgarVentanasRateLimit,
  type ResultadoRateLimit,
} from "./rate-limit";
export { enTransaccion, type OpcionesTransaccion, type TenantTx } from "./transaccion";
export { consumirPresupuesto, periodoDeMes } from "./presupuesto";
export type {
  ApiKey,
  AprobacionPlataforma,
  AuditEvent,
  AuditoriaGlobal,
  Invitation,
  Membership,
  Tenant,
  TenantModule,
  UsageEvent,
  User,
} from "./generated/prisma/client";
export { Prisma } from "./generated/prisma/client";

export { registrarConsumoSesion } from "./consumo-sesion";

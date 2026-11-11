// Punto de entrada de @opai/db. El código de negocio solo necesita `forTenant`, `enTransaccion` y los tipos.
export { bloquearCadena, avanzarCadena, type CadenaHechos } from "./cadenas";
export { cerrarClientes, dbAdmin } from "./client";
export { registrarObservadorConsultas } from "./metricas";
export { leerInbox } from "./inbox";
export { listarInstalaciones, type FiltroInstalaciones } from "./instalaciones-lista";
export { forTenant, validarTenantId, type TenantDb } from "./for-tenant";
export { forTenantUsuario, type TenantUsuarioDb } from "./for-tenant-usuario";
export { forUser, type UserDb } from "./for-user";
export { tenantPorSlug, usuarioPorId, tenantsOperables } from "./globales";
// Identidad (CAR-43): Better Auth con el rol `opai_auth`; el resto, solo operaciones con nombre.
export {
  borrarUsuario,
  clienteAuth,
  clienteBloqueoLogin,
  type ResultadoBorrado,
  restablecerSegundoFactor,
  estadoSesionEnTransaccion,
  ultimosAccesos,
  usuarioEnOtrasEmpresas,
} from "./identidad";
export { accesoPlataforma, preciosHasta, type Globales } from "./plataforma";
export type {
  DatosCondicionCobro,
  FiltroCargos,
  NuevoCargoCobro,
} from "./plataforma-empresa-cobros";
export { leerUfAlDia } from "./plataforma-indicadores";
export {
  type DatosTributarios,
  esRutRepetido,
  type PerfilTributario,
} from "./plataforma-perfil-tributario";
export type { HechoPlataforma } from "./plataforma-aprobaciones";
// La auditoría global solo se escribe por operaciones con nombre: `accesoPlataforma()` (ámbito
// `plataforma`) y `registrarEventoSeguridad` (ámbito `seguridad`, CAR-42). No se exporta el append.
export type { AmbitoAuditoriaGlobal, HechoGlobal } from "./auditoria-global";
export { type EventoSeguridad, registrarEventoSeguridad } from "./eventos-seguridad";
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
export { resolverTokenSeguimiento } from "./seguimiento-token";
export { resolverBuzonCorreo } from "./buzon-correo";
export { consolidarConsumos, RETENCION_CONSUMOS_DIAS } from "./consumos";
export { colaDeTrabajos, type ColaDeTrabajos, type TrabajoReclamado } from "./trabajos";
export { consumirRateLimit, purgarVentanasRateLimit, type ResultadoRateLimit } from "./rate-limit";
export {
  credencialesTerrenoPorRut,
  hashPin,
  HASH_PIN_SIN_PERSONA,
  verificarPin,
} from "./pin-terreno";
export {
  enTransaccion,
  enTransaccionConUsuario,
  type OpcionesTransaccion,
  type TenantTx,
} from "./transaccion";
export { enTransaccionCapturaSii } from "./transaccion-captura-sii";
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
export {
  remuneracionesPublicarSii,
  tryLockCapturaSiiXact,
  type PublicarSiiInput,
} from "./remuneraciones-sii";
export {
  remuneracionesProponerPrevisional,
  remuneracionesResolverPropuesta,
  type ClavePrevisional,
  type ProponerPrevisionalInput,
} from "./remuneraciones-previsional";
export { type AvisoCorreoBloqueo, type EntradaBloqueo, registrarBloqueoPin } from "./pin-bloqueo";
export {
  dispositivoPorToken,
  emparejarDispositivo,
  hmacDispositivo,
  LARGO_CODIGO,
  normalizarCodigo,
  nuevoCodigoEmparejamiento,
  VIGENCIA_CODIGO_MIN,
  type DispositivoEmparejado,
  type DispositivoReconocido,
} from "./dispositivos";

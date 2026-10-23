export { capacidadesDelNucleo, trabajosDelNucleo } from "./core";
export { generarApiKey, hashApiKey, slugDeApiKey } from "./core/apikey-formato";
export { catalogoPermisos } from "./core/me";
export {
  auditoriaEnDb,
  autorizador,
  crearContexto,
  type ParametrosContexto,
  SIN_TENANT,
  medidorEnDb,
} from "./contexto";
export { defineCapability } from "./define";
export { conflicto, ErrorCapacidad, noEncontrado, prohibido, reglaDeNegocio } from "./errores";
export { executeCapability } from "./execute";
export {
  limpiarRegistro,
  listarCapacidades,
  obtenerCapacidad,
  registrarCapacidades,
} from "./registry";
export type * from "./types";

export {
  defineModule,
  type EntradaNavegacion,
  type EventoDeDominio,
  limpiarModulos,
  listarModulos,
  type ModuleManifest,
  obtenerModulo,
  type Permiso,
  registrarModulos,
} from "./module";
export { portalesDe } from "./autorizacion";
export {
  type Consumidor,
  consumidoresDe,
  defineConsumidor,
  type EventoPublicado,
  limpiarConsumidores,
  registrarConsumidores,
} from "./eventos/consumidores";
export { despacharPendientes, MAX_INTENTOS_EVENTO } from "./eventos/despachar";
export { catalogoDeEventos, EVENTOS_CORE, eventoDeclarado } from "./eventos/catalogo";
export {
  defineTrabajo,
  type DefinicionTrabajo,
  limpiarTrabajos,
  listarTrabajos,
  obtenerTrabajo,
  registrarTrabajos,
  type Trabajo,
} from "./trabajos/registro";
export {
  type ColaTrabajos,
  ejecutarTrabajos,
  esperaReintento,
  programarPeriodicos,
} from "./trabajos/runner";
export { type ComprobanteNuevo, emitirComprobante, slugDeComprobante } from "./comprobantes";

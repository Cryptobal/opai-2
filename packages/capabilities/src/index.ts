export { capacidadesDelNucleo } from "./core";
export { generarApiKey, hashApiKey, slugDeApiKey } from "./core/apikey-formato";
export { catalogoPermisos } from "./core/me";
export {
  auditoriaEnDb,
  autorizador,
  crearContexto,
  type ParametrosContexto,
  SIN_TENANT,
  telemetriaEnDb,
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

export { capacidadesDelNucleo } from "./core/ping";
export { auditoriaEnDb, crearContexto, type ParametrosContexto } from "./contexto";
export { defineCapability } from "./define";
export { executeCapability } from "./execute";
export {
  limpiarRegistro,
  listarCapacidades,
  obtenerCapacidad,
  registrarCapacidades,
} from "./registry";
export type * from "./types";

import { capacidadesDelNucleo } from "./core/ping";
import { obtenerCapacidad, registrarCapacidades } from "./registry";

/** Registra las capacidades del núcleo una sola vez (seguro ante recargas en desarrollo). */
export function asegurarNucleo(): void {
  if (!obtenerCapacidad("core.ping")) registrarCapacidades(capacidadesDelNucleo);
}

export {
  defineModule,
  type EntradaNavegacion,
  type EventoDeDominio,
  type ModuleManifest,
  type Permiso,
  registrarModulos,
} from "./module";

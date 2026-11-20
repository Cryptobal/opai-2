import { PERMISOS_CORE } from "./permisos-catalogo";

/** No se conceden por `core:*`, `core:personas.*` ni por heredar permisos del responsable en API keys. */
export const PERMISOS_SOLO_EXPLICITOS_EN_KEY: readonly string[] = [PERMISOS_CORE.personasEstadoAdmin];

export function permisoSoloExplicitoEnKey(permiso: string): boolean {
  return (PERMISOS_SOLO_EXPLICITOS_EN_KEY as readonly string[]).includes(permiso);
}
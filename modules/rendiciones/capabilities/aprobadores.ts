import { accesoDeMembresia, type MembresiaConAcceso, tienePermisoEfectivo } from "@opai/domain";

import { PERMISO_APROBAR } from "./permisos";

/**
 * Si la membresía puede aprobar rendiciones, igual que en la sesión: rol base o personalizado
 * (archivado deniega), excepciones y roles que se suman (CAR-359). Leer con `INCLUIR_ACCESO`.
 */
export function puedeAprobarMembresia(m: MembresiaConAcceso): boolean {
  return tienePermisoEfectivo(accesoDeMembresia(m), PERMISO_APROBAR);
}

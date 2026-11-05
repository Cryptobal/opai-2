import { type Acceso, esRol, tienePermisoEfectivo } from "@opai/domain";

import { PERMISO_APROBAR } from "./permisos";

type Membresia = {
  rol: string;
  rolTenant: { archivadoEn: Date | null; permisos: string[] } | null;
  excepciones: readonly { permiso: string; conceder: boolean }[];
};

/** Si la membresía puede aprobar rendiciones (rol base o personalizado + excepciones, igual que la sesión). */
export function puedeAprobarMembresia(m: Membresia): boolean {
  const personalizado = m.rolTenant;
  const acceso: Acceso = {
    rol: personalizado || !esRol(m.rol) ? null : m.rol,
    // Un rol personalizado archivado deniega por defecto, igual que en la sesión.
    permisosRol: personalizado ? (personalizado.archivadoEn ? [] : personalizado.permisos) : null,
    excepciones: m.excepciones.map((e) => ({ permiso: e.permiso, conceder: e.conceder })),
  };
  return tienePermisoEfectivo(acceso, PERMISO_APROBAR);
}

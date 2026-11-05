import {
  type Acceso,
  moduloDe,
  type Rol,
  tienePermisoEfectivo,
  type UnidadCobro,
} from "@opai/domain";

import { catalogoPermisos } from "../../me";

/** Lo que cuenta `unidadesCobro()` de @opai/db: accesos de miembros activos, trabajadores e instalaciones. */
export type DatosUnidades = {
  miembros: readonly {
    rol: string;
    roleId: string | null;
    rolTenant: { permisos: readonly string[] } | null;
    excepciones: readonly { permiso: string; conceder: boolean }[];
  }[];
  trabajadores: number;
  instalaciones: number;
};

const aAcceso = (m: DatosUnidades["miembros"][number]): Acceso => ({
  rol: m.roleId ? null : (m.rol as Rol),
  permisosRol: m.rolTenant?.permisos ?? null,
  excepciones: m.excepciones,
});

/** Permiso por el que se cuenta «usuario que rinde»: los aprobadores no se cobran (ADR-071). */
export const PERMISO_RENDIR = "rendiciones:rendir";

/**
 * Unidades del mes de una condición, sin datos personales. `usuario_licencia` cuenta a quien tiene
 * algún permiso efectivo del módulo cobrado; el plan base no tiene licencias (cuenta 0).
 */
export function contarUnidades(d: DatosUnidades, unidad: UnidadCobro, moduloId: string): number {
  switch (unidad) {
    case "usuario_activo":
      return d.miembros.length;
    case "usuario_rinde":
      return d.miembros.filter((m) => tienePermisoEfectivo(aAcceso(m), PERMISO_RENDIR)).length;
    case "usuario_licencia": {
      const permisos = catalogoPermisos().filter((p) => moduloDe(p) === moduloId);
      return d.miembros.filter((m) => permisos.some((p) => tienePermisoEfectivo(aAcceso(m), p)))
        .length;
    }
    case "trabajador_activo":
      return d.trabajadores;
    case "instalacion_activa":
      return d.instalaciones;
  }
}

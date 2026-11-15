// Acceso efectivo de una membresía leída de la base (ADR-022, CAR-359): un solo cálculo para la
// sesión y para todo «quién puede X» (avisos, aprobadores, anexos). Lógica pura sobre la fila.

import { esRol } from "./permisos";
import type { Acceso, Excepcion } from "./permisos-efectivos";

type RolFila = { rol: { permisos: readonly string[]; archivadoEn: Date | null } };

/** Roles que se suman al principal: los adicionales del miembro y los de sus grupos (CAR-359). */
export type RolesQueSuman = {
  rolesAdicionales: readonly RolFila[];
  gruposUsuarios: readonly { grupo: { archivadoEn: Date | null; roles: readonly RolFila[] } }[];
};

export type MembresiaConAcceso = RolesQueSuman & {
  rol: string;
  rolTenant: { permisos: readonly string[]; archivadoEn: Date | null } | null;
  excepciones: readonly Excepcion[];
};

/**
 * Lo que hay que leer de la membresía para `accesoDeMembresia` (forma del `include` de Prisma, sin
 * importar Prisma): los roles adicionales y los de sus grupos, con lo justo para saber si conceden.
 */
export const INCLUIR_ROLES_QUE_SUMAN = {
  rolesAdicionales: { select: { rol: { select: { permisos: true, archivadoEn: true } } } },
  gruposUsuarios: {
    select: {
      grupo: {
        select: {
          archivadoEn: true,
          roles: { select: { rol: { select: { permisos: true, archivadoEn: true } } } },
        },
      },
    },
  },
} as const;

/** `include` completo para `accesoDeMembresia`: rol personalizado, excepciones y roles que suman. */
export const INCLUIR_ACCESO = {
  rolTenant: true,
  excepciones: true,
  ...INCLUIR_ROLES_QUE_SUMAN,
} as const;

const vigentes = (filas: readonly RolFila[]) =>
  filas.filter((f) => f.rol.archivadoEn === null).flatMap((f) => f.rol.permisos);

/** Permisos que suman los roles adicionales y los de los grupos vigentes, sin repetir. */
export function permisosAdicionalesDe(m: RolesQueSuman): string[] {
  const deGrupos = m.gruposUsuarios
    .filter((g) => g.grupo.archivadoEn === null)
    .flatMap((g) => vigentes(g.grupo.roles));
  return [...new Set([...vigentes(m.rolesAdicionales), ...deGrupos])].sort();
}

/**
 * Acceso de una membresía, igual que en la sesión: con rol personalizado manda su lista (archivado
 * deniega, nunca vuelve al rol base); sin él, el rol base. Excepciones y roles que se suman encima.
 */
export function accesoDeMembresia(m: MembresiaConAcceso): Acceso {
  const r = m.rolTenant;
  return {
    rol: r || !esRol(m.rol) ? null : m.rol,
    permisosRol: r ? (r.archivadoEn ? [] : r.permisos) : null,
    excepciones: m.excepciones.map((e) => ({ permiso: e.permiso, conceder: e.conceder })),
    permisosAdicionales: permisosAdicionalesDe(m),
  };
}

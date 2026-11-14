// Roles que se suman al principal (CAR-359): los adicionales del miembro y los de sus grupos
// vigentes. Un rol o un grupo archivado no concede nada (falla cerrado, igual que el rol principal).

/** Lo que `accesoConModulos` agrega al `include` de la membresía para leerlos en la misma consulta. */
export const INCLUIR_ROLES_ADICIONALES = {
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

type RolFila = { rol: { permisos: string[]; archivadoEn: Date | null } };

type MembresiaConRoles = {
  rolesAdicionales: readonly RolFila[];
  gruposUsuarios: readonly { grupo: { archivadoEn: Date | null; roles: readonly RolFila[] } }[];
};

const vigentes = (filas: readonly RolFila[]) =>
  filas.filter((f) => f.rol.archivadoEn === null).flatMap((f) => f.rol.permisos);

/** Permisos (patrones del catálogo) que suman los roles adicionales y de grupo, sin repetir. */
export function permisosAdicionalesDe(m: MembresiaConRoles): string[] {
  const deGrupos = m.gruposUsuarios
    .filter((g) => g.grupo.archivadoEn === null)
    .flatMap((g) => vigentes(g.grupo.roles));
  return [...new Set([...vigentes(m.rolesAdicionales), ...deGrupos])].sort();
}

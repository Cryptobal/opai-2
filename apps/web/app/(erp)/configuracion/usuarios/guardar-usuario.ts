// Arma la escritura de la ficha de usuario (A4) en UNA sola capacidad, para que nunca quede a medias:
// si solo cambia el rol personalizado, `core.roles.assign`; si cambia algo más, `core.users.update`
// con `roleId` (valida igual la escalada y el rol archivado). Lógica pura, probada en Vitest.

export type Ficha = {
  membershipId: string;
  rol: string;
  roleId: string | null;
  portales: string[];
  activo: boolean;
};
export type Cambios = { rolSel: string; portales: string[]; activo: boolean };

export type Escritura =
  | { id: "core.roles.assign"; input: { membershipId: string; roleId: string } }
  | { id: "core.users.update"; input: Record<string, unknown> };

const igual = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);

export function escrituraFicha(f: Ficha, c: Cambios): Escritura {
  const inicial = f.roleId ? `rol:${f.roleId}` : `base:${f.rol}`;
  const cambiaRol = c.rolSel !== inicial;
  const resto = !igual(f.portales, c.portales) || f.activo !== c.activo;
  const personalizado = c.rolSel.startsWith("rol:") ? c.rolSel.slice(4) : null;
  if (cambiaRol && personalizado && !resto) {
    return {
      id: "core.roles.assign",
      input: { membershipId: f.membershipId, roleId: personalizado },
    };
  }
  const rol = !cambiaRol
    ? {}
    : personalizado
      ? { roleId: personalizado }
      : { rol: c.rolSel.slice(5), ...(f.roleId ? { roleId: null } : {}) };
  return {
    id: "core.users.update",
    input: {
      membershipId: f.membershipId,
      ...rol,
      portales: c.portales,
      estado: c.activo ? "activa" : "suspendida",
    },
  };
}

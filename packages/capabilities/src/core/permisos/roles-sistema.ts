import { permisosDe, type Rol } from "@opai/domain";

import type { Contexto } from "../../types";
import { catalogoPermisos } from "../me";

/** Los cinco roles base (ADR-016) con su etiqueta y descripción de la sábana (ParteA, A09). */
const META: readonly { rol: Rol; nombre: string; descripcion: string }[] = [
  { rol: "owner", nombre: "Owner", descripcion: "Dueño de la empresa en OPAI. Puede hacer todo." },
  { rol: "admin", nombre: "Admin", descripcion: "Administra usuarios, configuración y todos los módulos." },
  { rol: "gerente", nombre: "Gerente", descripcion: "Gestiona la operación y lo comercial, sin configuración." },
  { rol: "supervisor", nombre: "Supervisor", descripcion: "Opera las instalaciones que tiene a cargo." },
  { rol: "viewer", nombre: "Viewer", descripcion: "Ve la información sin modificarla." },
];

/**
 * Roles base del sistema como filas de la lista (A09 «Partir de» y la columna «Del sistema»): sus
 * permisos salen expandidos de `PATRONES_POR_ROL` vía `permisosDe` (solo módulos activos), así la UI
 * no duplica la tabla de patrones. `usuarios` cuenta las membresías activas con ese rol base y sin rol
 * personalizado (roleId null). `sistema: true` y un id sentinela `sistema:<rol>` (no es un rol real).
 */
export async function rolesSistema(ctx: Contexto) {
  const g = await ctx.db.membership.groupBy({
    by: ["rol"],
    where: { estado: "activa", roleId: null },
    _count: { _all: true },
  });
  const porBase = new Map(g.map((x) => [x.rol, x._count._all]));
  const catalogo = catalogoPermisos();
  return META.map((m) => ({
    id: `sistema:${m.rol}`,
    nombre: m.nombre,
    descripcion: m.descripcion,
    sistema: true,
    permisos: permisosDe(m.rol, catalogo, ctx.modulosActivos),
    archivado: false,
    usuarios: porBase.get(m.rol) ?? 0,
  }));
}

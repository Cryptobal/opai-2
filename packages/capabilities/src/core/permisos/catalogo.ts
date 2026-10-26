import { z } from "zod";

import { moduloDe, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { catalogoPermisos } from "../me";

/** Catálogo agrupado por módulo (solo módulos activos; core siempre) para la matriz de permisos. */
export const permisosCatalogo = defineCapability({
  id: "core.permisos.catalogo",
  descripcion:
    "Catálogo de permisos del núcleo y de los módulos activos, agrupado por módulo y acción, para armar roles del tenant y excepciones por usuario.",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({}),
  output: z.array(
    z.object({
      modulo: z.string(),
      permisos: z.array(z.object({ id: z.string(), accion: z.string() })),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const activos = new Set(["core", ...ctx.modulosActivos]);
    const porModulo = new Map<string, { id: string; accion: string }[]>();
    for (const id of catalogoPermisos()) {
      const modulo = moduloDe(id);
      if (!activos.has(modulo)) continue;
      (porModulo.get(modulo) ?? porModulo.set(modulo, []).get(modulo)!).push({
        id,
        accion: id.slice(id.indexOf(":") + 1),
      });
    }
    return [...porModulo.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([modulo, permisos]) => ({ modulo, permisos }));
  },
});

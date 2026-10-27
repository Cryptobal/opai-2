import { z } from "zod";

import { moduloDe, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { catalogoPermisos } from "../me";

/**
 * Permisos que NO son ver/gestionar y van al grupo «especiales/sensibles», aunque su verbo fuese
 * `manage` (A08–A10): la matriz solo tiene columnas Ver y Gestionar; estos no encajan y la UI los
 * muestra aparte. `tenant.delete` y `estructuras.read_sensible` ya caen por su verbo; `owners.manage`
 * se agrega explícito por ser gobierno sensible.
 */
const SENSIBLES = new Set<string>([
  PERMISOS_CORE.tenantDelete,
  PERMISOS_CORE.ownersManage,
  PERMISOS_CORE.estructurasReadSensible,
]);

type Recurso = { recurso: string; ver: string | null; gestionar: string | null };
type Grupo = { recursos: Map<string, Recurso>; especiales: { id: string; accion: string }[] };

/** Divide `<modulo>:<recurso>.<verbo>` (o `<modulo>:<accion>`) en recurso y verbo. */
function parte(id: string): { recurso: string; verbo: string } {
  const accion = id.slice(id.indexOf(":") + 1);
  const i = accion.lastIndexOf(".");
  return i === -1
    ? { recurso: accion, verbo: accion }
    : { recurso: accion.slice(0, i), verbo: accion.slice(i + 1) };
}

/**
 * Catálogo agrupado por módulo y recurso para la matriz de permisos (A08–A10). Cada recurso expone qué
 * acciones existen —`ver` y `gestionar`, null donde no hay permiso (la UI pinta «N/A»)— y los permisos
 * que no son ver/gestionar van en `especiales`. Incluye TODOS los módulos registrados: los inactivos
 * con `activo:false` (5a), para que la matriz pinte «Módulo no activo» sin esconderlos. Un rol puede
 * llevar permisos de un módulo inactivo; quedan inertes hasta que el módulo se active (la autorización
 * filtra por módulos activos en `core.me`/`permisosDe`), por eso aquí no se rechazan.
 */
export const permisosCatalogo = defineCapability({
  id: "core.permisos.catalogo",
  descripcion:
    "Catálogo de permisos del núcleo y de todos los módulos, por módulo y recurso (ver/gestionar y especiales), para armar roles del tenant y excepciones por usuario.",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({}),
  output: z.array(
    z.object({
      modulo: z.string(),
      activo: z.boolean(),
      recursos: z.array(
        z.object({
          recurso: z.string(),
          ver: z.string().nullable(),
          gestionar: z.string().nullable(),
        }),
      ),
      especiales: z.array(z.object({ id: z.string(), accion: z.string() })),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const activos = new Set(["core", ...ctx.modulosActivos]);
    const porModulo = new Map<string, Grupo>();
    for (const id of catalogoPermisos()) {
      const modulo = moduloDe(id);
      const grupo: Grupo = porModulo.get(modulo) ?? { recursos: new Map(), especiales: [] };
      porModulo.set(modulo, grupo);
      const { recurso, verbo } = parte(id);
      const accion = id.slice(id.indexOf(":") + 1);
      if (SENSIBLES.has(id) || (verbo !== "read" && verbo !== "manage")) {
        grupo.especiales.push({ id, accion });
        continue;
      }
      const fila = grupo.recursos.get(recurso) ?? { recurso, ver: null, gestionar: null };
      grupo.recursos.set(recurso, fila);
      if (verbo === "read") fila.ver = id;
      else fila.gestionar = id;
    }
    return [...porModulo.entries()]
      .sort(([a], [b]) => (a === "core" ? -1 : b === "core" ? 1 : a.localeCompare(b)))
      .map(([modulo, g]) => ({
        modulo,
        activo: activos.has(modulo),
        recursos: [...g.recursos.values()].sort((x, y) => x.recurso.localeCompare(y.recurso)),
        especiales: g.especiales.sort((x, y) => x.id.localeCompare(y.id)),
      }));
  },
});

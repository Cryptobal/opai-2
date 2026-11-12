import { PERMISOS_CORE, tareaATiempo } from "@opai/domain";

import { defineHecho, moduloDeHecho, type HechoGestion } from "../../hechos-gestion";
import { listarModulos } from "../../module";
import type { Contexto } from "../../types";
import { zonaDelTenant } from "../turnos/comun";

/** Tarea completada por su responsable; si tiene varios, ocurre una vez para cada uno. */
const tareaCompletada = defineHecho({
  id: "core.tarea_completada",
  nombre: "Tarea completada",
  descripcion: "Una tarea asignada a la persona quedó hecha. Dice si se terminó a tiempo o con atraso.",
  sujeto: "usuario",
  entidad: "tarea",
  montos: [],
  atributos: [{ id: "a_tiempo", valores: ["si", "no"] }],
  permiso: PERMISOS_CORE.actividadesRead,
  async listar(ctx, rango) {
    const [zona, tareas] = await Promise.all([
      zonaDelTenant(ctx),
      ctx.db.actividad.findMany({
        where: {
          tipo: "tarea",
          estado: "hecha",
          completadaEn: { gte: rango.desde, lt: rango.hasta },
        },
        select: {
          id: true,
          estado: true,
          vencimiento: true,
          completadaEn: true,
          todoElDia: true,
          responsables: { select: { usuarioId: true } },
        },
      }),
    ]);
    return tareas.flatMap((t) => {
      if (!t.completadaEn) return [];
      const aTiempo = t.vencimiento
        ? tareaATiempo({ ...t, vencimiento: t.vencimiento }, zona)
        : true;
      const en = t.completadaEn;
      return t.responsables.map((r) => ({
        sujetoId: r.usuarioId,
        en,
        clave: t.id,
        atributos: { a_tiempo: aTiempo ? "si" : "no" },
      }));
    });
  },
});

/** Hechos que ofrece el propio núcleo. Los de los módulos vienen en su manifiesto. */
export const hechosDelNucleo: readonly HechoGestion[] = [tareaCompletada];

/** Todos los hechos declarados: núcleo más los manifiestos registrados. */
export function hechosDeclarados(): readonly HechoGestion[] {
  return [...hechosDelNucleo, ...listarModulos().flatMap((m) => m.hechos ?? [])];
}

/** Hechos disponibles para la empresa: los del núcleo y los de sus módulos activos. */
export function hechosDeLaEmpresa(ctx: Contexto): Map<string, HechoGestion> {
  const activos = hechosDeclarados().filter((h) => {
    const modulo = moduloDeHecho(h.id);
    return modulo === "core" || ctx.modulosActivos.includes(modulo);
  });
  return new Map(activos.map((h) => [h.id, h]));
}

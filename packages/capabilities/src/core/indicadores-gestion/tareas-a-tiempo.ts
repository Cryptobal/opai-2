import { PERMISOS_CORE, porcentajeDe, tareaATiempo, tareaCuenta } from "@opai/domain";

import { defineIndicador, type MedicionIndicador } from "../../indicadores-gestion";
import type { Contexto } from "../../types";
import { veNegocios } from "../crm/actividades-alcance";

const LOTE = 5000;

/** Consulta `ids` por lotes: una lista `IN` con todas las tareas del mes puede pasar el tope de parámetros. */
async function porLotes<T>(ids: readonly string[], leer: (lote: string[]) => Promise<T[]>): Promise<T[]> {
  const filas: T[] = [];
  for (let i = 0; i < ids.length; i += LOTE) filas.push(...(await leer(ids.slice(i, i + LOTE))));
  return filas;
}

/** Tareas ligadas a un negocio: quien no puede ver negocios tampoco las mide (misma regla que las listas). */
async function ligadasANegocio(ctx: Contexto, ids: readonly string[]): Promise<Set<string>> {
  if (veNegocios(ctx)) return new Set();
  const vinculos = await porLotes(ids, (lote) =>
    ctx.db.actividadVinculo.findMany({
      where: { actividadId: { in: lote } },
      select: { actividadId: true, negocioId: true },
    }),
  );
  return new Set(vinculos.filter((v) => v.negocioId !== null).map((v) => v.actividadId));
}

/**
 * Primer indicador del núcleo (ADR-094): oportunidad en las tareas del CRM. Se atribuye al usuario
 * responsable de la tarea; si una tarea tiene varios responsables, cuenta para cada uno.
 */
export const indicadorTareasATiempo = defineIndicador({
  id: "core.tareas_a_tiempo",
  nombre: "Tareas cumplidas a tiempo",
  descripcion:
    "De las tareas a su cargo que vencían en el período, qué porcentaje terminó sin atraso. No cuentan las canceladas ni las pendientes que aún tienen plazo.",
  tipo: "oportunidad",
  unidad: "porcentaje",
  sentido: "mayor",
  sujeto: "usuario",
  metaSugerida: 90,
  origen: "tareas asignadas, su vencimiento y su fecha de término",
  permiso: PERMISOS_CORE.actividadesRead,
  async medir(ctx, { rango, sujetos, zona, ahora }) {
    const tareas = await ctx.db.actividad.findMany({
      where: { tipo: "tarea", vencimiento: { gte: rango.desde, lt: rango.hasta } },
      select: { id: true, estado: true, vencimiento: true, completadaEn: true, todoElDia: true },
    });
    const medibles = new Map(
      tareas.flatMap((t) => {
        if (t.vencimiento === null) return [];
        const tarea = { ...t, vencimiento: t.vencimiento };
        return tareaCuenta(tarea, ahora) ? [[t.id, tarea] as const] : [];
      }),
    );
    if (medibles.size === 0) return [];
    const ids = [...medibles.keys()];
    const [ocultas, responsables] = await Promise.all([
      ligadasANegocio(ctx, ids),
      porLotes(ids, (lote) =>
        ctx.db.actividadResponsable.findMany({
          where: {
            actividadId: { in: lote },
            ...(sujetos ? { usuarioId: { in: [...sujetos] } } : {}),
          },
          select: { actividadId: true, usuarioId: true },
        }),
      ),
    ]);
    const cuenta = new Map<string, { total: number; aTiempo: number }>();
    for (const r of responsables) {
      const tarea = medibles.get(r.actividadId);
      if (!tarea || ocultas.has(r.actividadId)) continue;
      const c = cuenta.get(r.usuarioId) ?? { total: 0, aTiempo: 0 };
      c.total += 1;
      if (tareaATiempo(tarea, zona)) c.aTiempo += 1;
      cuenta.set(r.usuarioId, c);
    }
    return [...cuenta].map(
      ([sujetoId, c]): MedicionIndicador => ({ sujetoId, valor: porcentajeDe(c.aTiempo, c.total) }),
    );
  },
});

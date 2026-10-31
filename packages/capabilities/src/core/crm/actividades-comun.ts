// Actividad unificada (CAR-26): esquemas y vista compartidos por sus capacidades.
import { z } from "zod";

import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { entidadVisible, filtrarVisibles, visibilidad } from "./actividades-alcance";
import { ENTIDADES_ACTIVIDAD, TIPOS_ACTIVIDAD, columnaDe, iso } from "./comun";

export const PERMISO_READ = "core:actividades.read";
export const PERMISO_MANAGE = "core:actividades.manage";

export const vinculoActividadSchema = z.object({
  tipo: z.enum(ENTIDADES_ACTIVIDAD),
  id: z.uuid(),
});

export const actividadSchema = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_ACTIVIDAD),
  titulo: z.string(),
  detalle: z.string().nullable(),
  ocurrioEn: z.string(),
  vencimiento: z.string().nullable(),
  todoElDia: z.boolean(),
  prioridad: z.string().nullable(),
  estado: z.string().nullable(),
  asistentes: z.array(z.string()),
  acuerdos: z.string().nullable(),
  proximoPaso: z.string().nullable(),
  completadaEn: z.string().nullable(),
  creadaPorId: z.string().nullable(),
  responsables: z.array(z.string()),
  vinculos: z.array(vinculoActividadSchema),
});

type Fila = {
  id: string;
  tipo: string;
  titulo: string;
  detalle: string | null;
  ocurrioEn: Date;
  vencimiento: Date | null;
  todoElDia: boolean;
  prioridad: string | null;
  estado: string | null;
  asistentes: string[];
  acuerdos: string | null;
  proximoPaso: string | null;
  completadaEn: Date | null;
  creadaPorId: string | null;
};

export const vistaActividad = (
  a: Fila,
  responsables: string[],
  vinculos: z.infer<typeof vinculoActividadSchema>[],
) => ({
  id: a.id,
  tipo: a.tipo as (typeof TIPOS_ACTIVIDAD)[number],
  titulo: a.titulo,
  detalle: a.detalle,
  ocurrioEn: a.ocurrioEn.toISOString(),
  vencimiento: iso(a.vencimiento),
  todoElDia: a.todoElDia,
  prioridad: a.prioridad,
  estado: a.estado,
  asistentes: a.asistentes,
  acuerdos: a.acuerdos,
  proximoPaso: a.proximoPaso,
  completadaEn: iso(a.completadaEn),
  creadaPorId: a.creadaPorId,
  responsables,
  vinculos,
});

/** Carga responsables y vínculos de un lote de actividades y arma sus vistas. */
export async function conRelaciones(ctx: Contexto, filas: Fila[]) {
  const ids = filas.map((f) => f.id);
  if (!ids.length) return [];
  const vis = await visibilidad(ctx);
  const [resp, vinc] = await Promise.all([
    ctx.db.actividadResponsable.findMany({ where: { actividadId: { in: ids } } }),
    ctx.db.actividadVinculo.findMany({ where: { actividadId: { in: ids } } }),
  ]);
  return filas.map((f) =>
    vistaActividad(
      f,
      resp.filter((r) => r.actividadId === f.id).map((r) => r.usuarioId),
      vinc
        .filter((v) => v.actividadId === f.id)
        .flatMap((v) =>
          ENTIDADES_ACTIVIDAD.flatMap((tipo) => {
            const id = v[columnaDe(tipo)];
            return id && entidadVisible(vis, tipo, id) ? [{ tipo, id }] : [];
          }),
        ),
    ),
  );
}

export async function actividadDe(ctx: Contexto, id: string) {
  const a = await ctx.db.actividad.findFirst({ where: { id } });
  // Fuera de la visibilidad del actor responde igual que inexistente (ADR-022).
  if (!a || !(await filtrarVisibles(ctx, [id])).length) throw noEncontrado("La actividad");
  return a;
}

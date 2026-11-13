// Ingreso y salida de una persona como lista de pasos (CAR-355): esquemas, vista y tareas del núcleo.
// Cada paso con responsable tiene una tarea (core.actividades, tipo «tarea») que lo muestra en Mis tareas,
// Inicio y la Bandeja, igual que los pasos del seguimiento comercial (CAR-160).
import { z } from "zod";

import { ESTADOS_PASO_PROCESO, TIPOS_PROCESO_PERSONA } from "@opai/domain";

import type { Contexto } from "../../types";

export type Tx = Parameters<Parameters<Contexto["transaccion"]>[0]>[0];

export const pasoSchema = z.object({
  id: z.string(),
  orden: z.number().int(),
  titulo: z.string(),
  responsableId: z.string().nullable(),
  responsable: z.string().nullable(),
  vence: z.string(),
  estado: z.enum(ESTADOS_PASO_PROCESO),
  tareaId: z.string().nullable(),
  hechoEn: z.string().nullable(),
  nota: z.string().nullable(),
});

export const procesoSchema = z.object({
  id: z.string(),
  vinculoId: z.string(),
  tipo: z.enum(TIPOS_PROCESO_PERSONA),
  estado: z.enum(["abierto", "cerrado"]),
  creadoEn: z.string(),
  cerradoEn: z.string().nullable(),
  pasos: z.array(pasoSchema),
});

type FilaPaso = {
  id: string;
  orden: number;
  titulo: string;
  responsableId: string | null;
  vence: Date;
  estado: string;
  actividadId: string | null;
  hechoEn: Date | null;
  nota: string | null;
};

export const vistaPaso = (p: FilaPaso, nombres: Map<string, string>): z.infer<typeof pasoSchema> => ({
  id: p.id,
  orden: p.orden,
  titulo: p.titulo,
  responsableId: p.responsableId,
  responsable: p.responsableId ? (nombres.get(p.responsableId) ?? "Usuario") : null,
  vence: p.vence.toISOString().slice(0, 10),
  estado: p.estado as z.infer<typeof pasoSchema>["estado"],
  tareaId: p.actividadId,
  hechoEn: p.hechoEn?.toISOString() ?? null,
  nota: p.nota,
});

/** Nombres visibles de los usuarios (responsables) de la empresa. */
export async function nombresUsuarios(ctx: Contexto, ids: readonly (string | null)[]) {
  const unicos = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (!unicos.length) return new Map<string, string>();
  const us = await ctx.db.user.findMany({ where: { id: { in: unicos } }, select: { id: true, name: true, email: true } });
  return new Map(us.map((u) => [u.id, u.name || u.email]));
}

/** Título de la tarea: «Ingreso de Ana Pérez: Firmar contrato». */
export const tituloTarea = (tipo: string, nombre: string, paso: string) =>
  `${tipo === "ingreso" ? "Ingreso" : "Salida"} de ${nombre}: ${paso}`.slice(0, 200);

/** Crea la tarea del paso asignada a su responsable (mismos eventos que una tarea creada a mano). */
export async function crearTarea(
  ctx: Contexto,
  tx: Tx,
  d: { titulo: string; personaId: string; responsableId: string; vence: Date },
): Promise<string> {
  const a = await tx.actividad.create({
    data: {
      tenantId: ctx.tenantId, tipo: "tarea", titulo: d.titulo,
      detalle: `Paso de la lista en Personas › ficha › Laboral (/personas/${d.personaId}/laboral).`,
      ocurrioEn: new Date(), vencimiento: d.vence, todoElDia: true, prioridad: "media", estado: "pendiente",
      asistentes: [], completadaEn: null, creadaPorId: ctx.usuario?.id ?? null,
    },
  });
  await tx.actividadResponsable.create({ data: { tenantId: ctx.tenantId, actividadId: a.id, usuarioId: d.responsableId } });
  await ctx.eventos.emitir(tx, { tipo: "core.actividad.registrada", entidadTipo: "actividad", entidadId: a.id, payload: { tipo: "tarea" } });
  await ctx.eventos.emitir(tx, {
    tipo: "core.actividad.tarea_asignada", entidadTipo: "actividad", entidadId: a.id,
    payload: { responsables: [d.responsableId] },
  });
  return a.id;
}

/** Deja la tarea en el estado del paso (idempotente: no toca una tarea que ya está así). */
export async function sincronizarTarea(ctx: Contexto, tx: Tx, tareaId: string | null, estadoPaso: string) {
  if (!tareaId) return;
  const destino = estadoPaso === "hecho" ? "hecha" : estadoPaso === "omitido" ? "cancelada" : "pendiente";
  const hecha = destino === "hecha";
  const r = await tx.actividad.updateMany({
    where: { id: tareaId, tipo: "tarea", estado: { not: destino } },
    data: { estado: destino, completadaEn: hecha ? new Date() : null, completadaPorId: hecha ? (ctx.usuario?.id ?? null) : null },
  });
  if (!r.count) return;
  await ctx.eventos.emitir(tx, {
    tipo: hecha ? "core.actividad.tarea_completada" : "core.actividad.actualizada",
    entidadTipo: "actividad",
    entidadId: tareaId,
    payload: hecha ? { origen: "proceso_persona" } : { estado: destino, origen: "proceso_persona" },
  });
}

// Capacidades de las listas de ingreso y salida (CAR-355): misma pantalla, /api/v1 y MCP.
import { z } from "zod";

import { ESTADOS_PASO_PROCESO, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../../errores";
import { exigirResponsables } from "../crm/comun";
import { uuidSchema } from "../esquemas";
import { diaSchema } from "../maestros/comun";
import { personaDe } from "../maestros/personas-vista";
import { crearTarea, nombresUsuarios, pasoSchema, procesoSchema, sincronizarTarea, tituloTarea, vistaPaso } from "./comun";
import { recalcularEstado } from "./consumidor";

export const procesosListar = defineCapability({
  id: "core.procesos_persona.listar",
  descripcion:
    "Lista las listas de ingreso y de salida de una persona, con cada paso, su responsable, su plazo y si está hecho, por hacer u omitido.",
  permiso: PERMISOS_CORE.vinculosRead,
  input: z.object({ personaId: uuidSchema }),
  output: z.object({ procesos: z.array(procesoSchema) }),
  efecto: "lectura",
  dryRun: false,
  // NÚCLEO-H: revela que la persona tuvo ingreso o salida y sus pasos; se auditan las listas devueltas.
  auditarLectura: (s) => s.procesos.map((p) => p.id),
  async handler(ctx, input) {
    await personaDe(ctx, input.personaId);
    const filas = await ctx.db.procesoPersona.findMany({
      where: { personaId: input.personaId },
      orderBy: { createdAt: "desc" },
      include: { pasos: { orderBy: { orden: "asc" } } },
    });
    const nombres = await nombresUsuarios(ctx, filas.flatMap((f) => f.pasos.map((p) => p.responsableId)));
    return {
      procesos: filas.map((f) => ({
        id: f.id,
        vinculoId: f.vinculoId,
        tipo: f.tipo as "ingreso" | "salida",
        estado: f.estado as "abierto" | "cerrado",
        creadoEn: f.createdAt.toISOString(),
        cerradoEn: f.cerradoEn?.toISOString() ?? null,
        pasos: f.pasos.map((p) => vistaPaso(p, nombres)),
      })),
    };
  },
});

export const procesosPasoActualizar = defineCapability({
  id: "core.procesos_persona.paso_actualizar",
  descripcion:
    "Marca un paso de la lista de ingreso o salida como hecho, omitido o por hacer, o le cambia responsable, plazo o nota (motivo). La tarea del responsable se actualiza igual.",
  permiso: PERMISOS_CORE.vinculosManage,
  input: z
    .object({
      id: uuidSchema,
      estado: z.enum(ESTADOS_PASO_PROCESO).optional(),
      responsableId: uuidSchema.nullable().optional(),
      vence: diaSchema.optional(),
      /** Nota del paso (motivo al omitir). */
      motivo: z.string().trim().max(500).nullable().optional(),
    })
    .refine(
      (v) => v.estado !== undefined || v.responsableId !== undefined || v.vence !== undefined || v.motivo !== undefined,
      "Nada que cambiar.",
    ),
  output: pasoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const paso = await ctx.db.procesoPersonaPaso.findUnique({ where: { id: input.id }, include: { proceso: true } });
    if (!paso) throw noEncontrado("El paso");
    // Alcance por filas (ADR-022): una persona fuera de alcance responde igual que un paso inexistente.
    const persona = await personaDe(ctx, paso.proceso.personaId).catch(() => {
      throw noEncontrado("El paso");
    });
    if (input.responsableId) await exigirResponsables(ctx, [input.responsableId]);
    const notaFinal = input.motivo !== undefined ? input.motivo : paso.nota;
    if ((input.estado ?? paso.estado) === "omitido" && !notaFinal)
      throw reglaDeNegocio("Para omitir un paso, deja una nota con el motivo.");
    const estado = input.estado ?? paso.estado;
    const cambia = estado !== paso.estado;
    const data = {
      estado,
      ...(input.responsableId !== undefined ? { responsableId: input.responsableId } : {}),
      ...(input.vence !== undefined ? { vence: new Date(`${input.vence}T00:00:00.000Z`) } : {}),
      ...(input.motivo !== undefined ? { nota: input.motivo } : {}),
      ...(cambia
        ? estado === "hecho"
          ? { hechoEn: new Date(), hechoPorId: ctx.usuario?.id ?? null }
          : { hechoEn: null, hechoPorId: null }
        : {}),
    };
    const nombres = await nombresUsuarios(ctx, [data.responsableId ?? paso.responsableId]);
    if (dryRun) return vistaPaso({ ...paso, ...data }, nombres);
    const r = await ctx.transaccion(async (tx) => {
      // Concurrencia: si el paso cambió (p. ej. su tarea se completó en Mis tareas) desde que se leyó,
      // no se pisa con datos viejos.
      const vigente = await tx.procesoPersonaPaso.updateMany({
        where: { id: paso.id, estado: paso.estado, updatedAt: paso.updatedAt },
        data: { updatedAt: new Date() },
      });
      if (!vigente.count) throw conflicto("El paso cambió mientras lo editabas. Recarga y vuelve a intentarlo.");
      const otroResponsable = input.responsableId !== undefined && input.responsableId !== paso.responsableId;
      let actividadId = paso.actividadId;
      // Reasignar un paso por hacer: la tarea anterior se cancela y el nuevo responsable recibe una propia.
      // Un paso ya cerrado conserva su tarea (hecha o cancelada) tal como quedó.
      if (otroResponsable && paso.estado === "por_hacer") {
        await sincronizarTarea(ctx, tx, actividadId, "omitido");
        actividadId = null;
      }
      const resp = data.responsableId ?? paso.responsableId;
      const vence = data.vence ?? paso.vence;
      if (!actividadId && resp && estado === "por_hacer")
        actividadId = await crearTarea(ctx, tx, {
          titulo: tituloTarea(paso.proceso.tipo, `${persona.nombres} ${persona.apellidos}`.trim(), paso.titulo),
          personaId: paso.proceso.personaId, responsableId: resp, vence,
        });
      else await sincronizarTarea(ctx, tx, actividadId, estado);
      if (actividadId && data.vence) await tx.actividad.updateMany({ where: { id: actividadId }, data: { vencimiento: vence } });
      const actualizado = await tx.procesoPersonaPaso.update({ where: { id: paso.id }, data: { ...data, actividadId } });
      await recalcularEstado(tx, paso.procesoId);
      await ctx.eventos.emitir(tx, {
        tipo: "core.persona.proceso_paso_actualizado",
        entidadTipo: "persona",
        entidadId: paso.proceso.personaId,
        payload: { procesoId: paso.procesoId, pasoId: paso.id, estado },
      });
      return actualizado;
    });
    return vistaPaso(r, nombres);
  },
});

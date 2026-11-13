import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_MANAGE } from "./comun";
import { responsableValido } from "./validaciones";

const entrada = z
  .object({
    negocioIds: z.array(uuidSchema).min(1).max(200).optional().describe("Negocios a transferir (selección)."),
    deResponsableId: uuidSchema.optional().describe("Transfiere toda la cartera abierta de esta persona."),
    nuevoResponsableId: uuidSchema.describe("Nuevo responsable: usuario activo de la empresa."),
    incluirTareas: z.boolean().default(true).describe("También pasan las tareas pendientes de esos negocios."),
    mensaje: z.string().trim().max(500).optional().describe("Nota para el nuevo responsable (va en su aviso)."),
  })
  .refine((x) => (x.negocioIds ? 1 : 0) + (x.deResponsableId ? 1 : 0) === 1, {
    message: "Indica los negocios o la persona cuya cartera se transfiere, no ambos.",
  });

const salida = z.object({
  negocios: z.number().int(),
  valorMensual: z.number().int(),
  tareas: z.number().int(),
  omitidos: z.array(z.object({ id: z.string(), motivo: z.enum(["no_encontrado", "no_abierto", "ya_es_responsable"]) })),
});

type Omitido = z.infer<typeof salida>["omitidos"][number];

/** Negocios que se transfieren (abiertos, sin archivar, de otro responsable) y los que no, con su motivo. */
async function elegir(ctx: Parameters<typeof responsableValido>[0], input: z.infer<typeof entrada>) {
  const filas = await ctx.db.negocio.findMany({
    where: input.negocioIds ? { id: { in: input.negocioIds } } : { responsableId: input.deResponsableId ?? "", estado: "abierto", archivadoEn: null },
    select: { id: true, estado: true, archivadoEn: true, responsableId: true, valorMensual: true, montoEstimadoMensual: true },
  });
  const omitidos: Omitido[] = (input.negocioIds ?? []).filter((id) => !filas.some((f) => f.id === id)).map((id) => ({ id, motivo: "no_encontrado" }));
  const van = filas.filter((f) => {
    const motivo = f.estado !== "abierto" || f.archivadoEn ? "no_abierto" : f.responsableId === input.nuevoResponsableId ? "ya_es_responsable" : null;
    if (motivo) omitidos.push({ id: f.id, motivo });
    return !motivo;
  });
  return { van, omitidos };
}

export const negociosTransferir = defineCapability({
  id: "comercial.negocios.transferir",
  descripcion:
    "Transfiere negocios abiertos a otro responsable: los elegidos o toda la cartera abierta de una persona, con sus tareas pendientes, y le avisa al nuevo responsable.",
  permiso: PERMISO_MANAGE,
  input: entrada,
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await responsableValido(ctx, input.nuevoResponsableId);
    const { van, omitidos } = await elegir(ctx, input);
    const ids = van.map((n) => n.id);
    const anteriores = [...new Set(van.flatMap((n) => (n.responsableId ? [n.responsableId] : [])))];
    const tareas =
      input.incluirTareas && ids.length && anteriores.length
        ? await ctx.db.actividad.findMany({
            where: {
              tipo: "tarea",
              estado: "pendiente",
              vinculos: { some: { negocioId: { in: ids } } },
              responsables: { some: { usuarioId: { in: anteriores } } },
            },
            select: { id: true },
          })
        : [];
    const resumen = {
      negocios: ids.length,
      valorMensual: van.reduce((s, n) => s + (n.valorMensual ?? n.montoEstimadoMensual ?? 0), 0),
      tareas: tareas.length,
      omitidos,
    };
    if (dryRun || !ids.length) return resumen;
    const nuevo = input.nuevoResponsableId;
    await ctx.transaccion(async (tx) => {
      await tx.negocio.updateMany({ where: { id: { in: ids } }, data: { responsableId: nuevo } });
      const tareaIds = tareas.map((t) => t.id);
      if (tareaIds.length) {
        await tx.actividadResponsable.deleteMany({ where: { actividadId: { in: tareaIds }, usuarioId: { in: anteriores } } });
        await tx.actividadResponsable.createMany({
          data: tareaIds.map((actividadId) => ({ tenantId: ctx.tenantId, actividadId, usuarioId: nuevo })),
          skipDuplicates: true,
        });
      }
      for (const id of ids)
        await ctx.eventos.emitir(tx, { tipo: "comercial.negocio.actualizado", entidadTipo: "negocio", entidadId: id, payload: { campos: ["responsableId"] } });
      const n = ids.length;
      await tx.notificacion.create({
        data: {
          tenantId: ctx.tenantId,
          usuarioId: nuevo,
          titulo: `Te transfirieron ${n} ${n === 1 ? "negocio" : "negocios"}${tareaIds.length ? ` y ${tareaIds.length} ${tareaIds.length === 1 ? "tarea" : "tareas"}` : ""}`,
          cuerpo: input.mensaje || null,
          enlace: `/negocios/lista?responsable=${nuevo}`,
        },
      });
    });
    return resumen;
  },
});

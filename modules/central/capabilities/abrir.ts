import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { PERMISO_ATENDER, severidadSchema, uuidSchema } from "./esquemas";
import { exigirAgenteHabilitado } from "./humano";
import { ID_VISTA_PREVIA, registrarHecho } from "./util";

export const alertasAbrir = defineCapability({
  id: "central.alertas.abrir",
  descripcion:
    "Abre a mano una alerta en la central para una instalación (y opcionalmente el guardia involucrado), con título, descripción y severidad; queda nueva en la cola.",
  permiso: PERMISO_ATENDER,
  input: z.object({
    instalacionId: uuidSchema,
    personaId: uuidSchema.optional(),
    titulo: z.string().trim().min(3).max(140),
    descripcion: z.string().trim().max(2000).default(""),
    severidad: severidadSchema,
  }),
  output: z.object({ id: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (ctx.alcance && !ctx.alcance.instalaciones.includes(input.instalacionId))
      throw noEncontrado("La instalación");
    const inst = await ctx.db.instalacion.findFirst({ where: { id: input.instalacionId }, select: { id: true } });
    if (!inst) throw noEncontrado("La instalación");
    if (input.personaId) {
      const p = await ctx.db.persona.findFirst({ where: { id: input.personaId }, select: { id: true } });
      if (!p) throw noEncontrado("La persona");
    }
    await exigirAgenteHabilitado(ctx, ctx.db, null, input.instalacionId);
    if (dryRun) return { id: ID_VISTA_PREVIA };
    const creada = await ctx.transaccion(async (tx) => {
      const a = await tx.centralAlerta.create({
        data: {
          tenantId: ctx.tenantId,
          instalacionId: input.instalacionId,
          personaId: input.personaId ?? null,
          titulo: input.titulo,
          descripcion: input.descripcion,
          severidad: input.severidad,
          origen: "manual",
          abiertaPorId: ctx.usuario?.id ?? null,
        },
      });
      await registrarHecho(ctx, tx, { alertaId: a.id, tipo: "abierta", estadoDesde: null, estadoHacia: "nueva" });
      await ctx.eventos.emitir(tx, {
        tipo: "central.alerta.abierta",
        entidadTipo: "central.alerta",
        entidadId: a.id,
        payload: { instalacionId: a.instalacionId, severidad: a.severidad, origen: a.origen },
      });
      return a;
    });
    return { id: creada.id };
  },
});

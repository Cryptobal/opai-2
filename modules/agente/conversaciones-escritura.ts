import { defineCapability, noEncontrado, prohibido } from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";
import { z } from "zod";

const uuid = z.string().uuid();
const salida = z.object({ id: uuid, hecho: z.boolean() });

/** Fila propia de la persona; cualquier otra (de otra persona o empresa) responde «no existe». */
async function propia(ctx: Contexto, id: string) {
  if (!ctx.usuario || ctx.principal?.tipo === "servicio") throw prohibido("Requiere una persona.");
  const f = await ctx.db.agenteConversacion.findFirst({
    where: { tenantId: ctx.tenantId, userId: ctx.usuario.id, id },
    select: { id: true },
  });
  if (!f) throw noEncontrado("La conversación");
  return f.id;
}

export const conversacionesRenombrar = defineCapability({
  id: "agente.conversaciones.renombrar",
  permiso: "agente:usar",
  descripcion:
    "Cambia el título de una conversación guardada del agente interno de la persona actual (hasta 80 caracteres).",
  input: z.object({ id: uuid, titulo: z.string().trim().min(1).max(80) }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const id = await propia(ctx, input.id);
    if (!dryRun)
      await ctx.db.agenteConversacion.update({ where: { id }, data: { titulo: input.titulo } });
    return { id, hecho: !dryRun };
  },
});

export const conversacionesArchivar = defineCapability({
  id: "agente.conversaciones.archivar",
  permiso: "agente:usar",
  descripcion:
    "Archiva o desarchiva una conversación guardada del agente interno de la persona actual; archivada sale de la lista principal.",
  input: z.object({ id: uuid, archivar: z.boolean().default(true) }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const id = await propia(ctx, input.id);
    if (!dryRun)
      await ctx.db.agenteConversacion.update({
        where: { id },
        data: { archivadaEn: input.archivar ? new Date() : null },
      });
    return { id, hecho: !dryRun };
  },
});

export const conversacionesBorrar = defineCapability({
  id: "agente.conversaciones.borrar",
  permiso: "agente:usar",
  descripcion:
    "Borra para siempre una conversación guardada del agente interno de la persona actual; no se puede recuperar.",
  input: z.object({ id: uuid }),
  output: salida,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const id = await propia(ctx, input.id);
    if (!dryRun) await ctx.db.agenteConversacion.delete({ where: { id } });
    return { id, hecho: !dryRun };
  },
});

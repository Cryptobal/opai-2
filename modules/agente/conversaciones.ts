import { defineCapability, externo, noEncontrado, prohibido } from "@opai/capabilities";
import { z } from "zod";

import { contextoSchema, mensajeSchema } from "./conversaciones-guardado";

const uuid = z.string().uuid();

const resumenSchema = z.object({
  id: uuid,
  titulo: externo(z.string()),
  contexto: contextoSchema.nullable(),
  mensajes: z.number().int(),
  archivada: z.boolean(),
  ultimaActividad: z.string(),
});

const detalleSchema = resumenSchema.extend({
  historial: z.array(mensajeSchema.extend({ texto: externo(z.string()) })),
});

function persona(ctx: { usuario?: { id: string } | null; principal?: { tipo: string } | null }) {
  // Las conversaciones son de la persona: un servicio no hereda las de su responsable (ADR-051).
  if (!ctx.usuario || ctx.principal?.tipo === "servicio") throw prohibido("Requiere una persona.");
  return ctx.usuario.id;
}

type Fila = {
  id: string;
  titulo: string;
  contextoTipo: string | null;
  contextoId: string | null;
  archivadaEn: Date | null;
  ultimaActividad: Date;
  mensajes: unknown;
};
const SELECT = {
  id: true,
  titulo: true,
  contextoTipo: true,
  contextoId: true,
  archivadaEn: true,
  ultimaActividad: true,
  mensajes: true,
} as const;

function resumir(f: Fila) {
  const contexto = contextoSchema.safeParse({ tipo: f.contextoTipo, id: f.contextoId });
  return {
    id: f.id,
    titulo: f.titulo,
    contexto: contexto.success ? contexto.data : null,
    mensajes: Array.isArray(f.mensajes) ? f.mensajes.length : 0,
    archivada: f.archivadaEn !== null,
    ultimaActividad: f.ultimaActividad.toISOString(),
  };
}

export const conversacionesList = defineCapability({
  id: "agente.conversaciones.list",
  permiso: "agente:usar",
  descripcion:
    "Lista las conversaciones guardadas del agente interno de la persona actual en esta empresa, las más recientes primero.",
  input: z.object({
    archivadas: z.boolean().default(false),
    limite: z.number().int().min(1).max(50).default(20),
  }),
  output: z.array(resumenSchema),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.map((c) => c.id),
  async handler(ctx, input) {
    const filas = await ctx.db.agenteConversacion.findMany({
      where: {
        tenantId: ctx.tenantId,
        userId: persona(ctx),
        archivadaEn: input.archivadas ? { not: null } : null,
      },
      orderBy: { ultimaActividad: "desc" },
      take: input.limite,
      select: SELECT,
    });
    return filas.map(resumir);
  },
});

export const conversacionesGet = defineCapability({
  id: "agente.conversaciones.get",
  permiso: "agente:usar",
  descripcion:
    "Devuelve una conversación guardada del agente interno de la persona actual, con todos sus mensajes, para retomarla.",
  input: z.object({ id: uuid }),
  output: detalleSchema,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.id],
  async handler(ctx, input) {
    const f = await ctx.db.agenteConversacion.findFirst({
      where: { tenantId: ctx.tenantId, userId: persona(ctx), id: input.id },
      select: SELECT,
    });
    if (!f) throw noEncontrado("La conversación");
    const historial = mensajeSchema.array().safeParse(f.mensajes);
    return { ...resumir(f), historial: historial.success ? historial.data : [] };
  },
});

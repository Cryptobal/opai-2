import type { Contexto } from "@opai/capabilities";
import { z } from "zod";

export const RETENCION_DIAS = 90;
export const MAX_MENSAJES = 200;

export const contextoSchema = z.object({
  tipo: z.enum(["cuenta", "instalacion", "negocio", "persona"]),
  id: z.string().uuid(),
});

export const mensajeSchema = z.object({
  rol: z.enum(["usuario", "agente"]),
  texto: z.string(),
  /** Capacidades que propuso el plan; sin vistas previas ni el token firmado. */
  pasos: z.array(z.string()).optional(),
  fecha: z.string(),
});
export type Mensaje = z.infer<typeof mensajeSchema>;

const titular = (texto: string) => texto.replace(/\s+/g, " ").trim().slice(0, 80);

type Turno = {
  conversacionId?: string | undefined;
  contexto?: z.infer<typeof contextoSchema> | undefined;
  mensaje: string;
  texto: string;
  pasos: string[];
};

/** Guarda un turno en la conversación de la persona (la crea si no hay id). Solo toca filas propias. */
export async function guardarTurno(ctx: Contexto, t: Turno): Promise<string | null> {
  const usuario = ctx.usuario;
  if (!usuario || ctx.principal?.tipo === "servicio") return null;
  const ahora = new Date();
  const nuevos: Mensaje[] = [
    { rol: "usuario", texto: t.mensaje, fecha: ahora.toISOString() },
    {
      rol: "agente",
      texto: t.texto,
      ...(t.pasos.length ? { pasos: t.pasos } : {}),
      fecha: ahora.toISOString(),
    },
  ];
  const propia = { tenantId: ctx.tenantId, userId: usuario.id };
  // Retención (R19/R20): las conversaciones propias sin actividad por más de 90 días se borran.
  await ctx.db.agenteConversacion.deleteMany({
    where: {
      ...propia,
      ultimaActividad: { lt: new Date(ahora.getTime() - RETENCION_DIAS * 864e5) },
    },
  });
  if (t.conversacionId) {
    const actual = await ctx.db.agenteConversacion.findFirst({
      where: { ...propia, id: t.conversacionId, archivadaEn: null },
      select: { id: true, mensajes: true },
    });
    if (actual) {
      const previos = mensajeSchema.array().safeParse(actual.mensajes);
      const todos = [...(previos.success ? previos.data : []), ...nuevos].slice(-MAX_MENSAJES);
      await ctx.db.agenteConversacion.update({
        where: { id: actual.id },
        data: { mensajes: todos, ultimaActividad: ahora },
      });
      return actual.id;
    }
  }
  const creada = await ctx.db.agenteConversacion.create({
    data: {
      ...propia,
      titulo: titular(t.mensaje),
      contextoTipo: t.contexto?.tipo ?? null,
      contextoId: t.contexto?.id ?? null,
      mensajes: nuevos,
      ultimaActividad: ahora,
    },
    select: { id: true },
  });
  return creada.id;
}

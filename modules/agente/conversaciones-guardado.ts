import { ajuste, conflicto } from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";
import { z } from "zod";

export const RETENCION_DIAS = 90;
export const MAX_MENSAJES = 200;
/** Intentos de guardar sobre la versión vigente cuando otra pestaña escribió primero. */
const INTENTOS = 4;

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
  /** Turno que originó el mensaje: un reintento con el mismo id no se vuelve a guardar. */
  turno: z.string().uuid().optional(),
});
export type Mensaje = z.infer<typeof mensajeSchema>;

const TOPE_TEXTO = 8_000;
const recortar = (t: string) => (t.length > TOPE_TEXTO ? `${t.slice(0, TOPE_TEXTO)}…` : t);
/** Límite de la retención: lo más antiguo que se conserva. */
export const corteRetencion = (ahora: Date, dias: number = RETENCION_DIAS) =>
  new Date(ahora.getTime() - dias * 864e5);
const titular = (texto: string) => texto.replace(/\s+/g, " ").trim().slice(0, 80);

/** Días de retención de la empresa (ajuste del módulo); sin ajuste declarado rige el defecto. */
// Falla cerrado: si el ajuste no se puede leer, el error sube y nada se borra. Con 90 de
// respaldo, una falla transitoria destruiría el historial de una empresa que configuró más.
export async function diasRetencion(ctx: Contexto): Promise<number> {
  const v = await ajuste<unknown>(ctx, "agente", "retencionConversacionesDias");
  return typeof v === "number" && v >= 1 ? v : RETENCION_DIAS;
}

type Turno = {
  conversacionId?: string | undefined;
  turnoId?: string | undefined;
  contexto?: z.infer<typeof contextoSchema> | undefined;
  mensaje: string;
  texto: string;
  pasos: string[];
};

/**
 * Guarda un turno en la conversación de la persona (la crea si no hay id). Solo toca filas propias.
 * Escribe con versión (`updateMany ... WHERE version`): si otra pestaña guardó antes, relee y suma
 * sus mensajes en vez de pisarlos. Un `turnoId` ya guardado no se repite.
 */
export async function guardarTurno(ctx: Contexto, t: Turno): Promise<string | null> {
  const usuario = ctx.usuario;
  if (!usuario || ctx.principal?.tipo === "servicio") return null;
  const ahora = new Date();
  const base = { fecha: ahora.toISOString(), ...(t.turnoId ? { turno: t.turnoId } : {}) };
  const nuevos: Mensaje[] = [
    { rol: "usuario", texto: recortar(t.mensaje), ...base },
    {
      rol: "agente",
      texto: recortar(t.texto),
      ...(t.pasos.length ? { pasos: t.pasos } : {}),
      ...base,
    },
  ];
  const propia = { tenantId: ctx.tenantId, userId: usuario.id };
  const corte = corteRetencion(ahora, await diasRetencion(ctx));
  // Retención (R19/R20): las propias sin actividad por más del plazo se borran, salvo la que se usa.
  const purgar = (excepto?: string) =>
    ctx.db.agenteConversacion.deleteMany({
      where: {
        ...propia,
        ...(excepto ? { id: { not: excepto } } : {}),
        ultimaActividad: { lt: corte },
      },
    });
  if (t.conversacionId) {
    let agotado = true;
    for (let intento = 0; intento < INTENTOS; intento++) {
      const actual = await ctx.db.agenteConversacion.findFirst({
        where: { ...propia, id: t.conversacionId, archivadaEn: null },
        select: { id: true, mensajes: true, version: true },
      });
      if (!actual) {
        agotado = false; // ajena, archivada o inexistente: se crea otra
        break;
      }
      const previos = mensajeSchema.array().safeParse(actual.mensajes);
      const lista = previos.success ? previos.data : [];
      if (t.turnoId && lista.some((m) => m.turno === t.turnoId)) return actual.id;
      const r = await ctx.db.agenteConversacion.updateMany({
        where: { id: actual.id, ...propia, version: actual.version },
        data: {
          mensajes: [...lista, ...nuevos].slice(-MAX_MENSAJES),
          ultimaActividad: ahora,
          version: { increment: 1 },
        },
      });
      if (r.count === 1) {
        await purgar(actual.id);
        return actual.id;
      }
    }
    if (agotado) throw conflicto("La conversación cambió en otra pestaña. Reintenta.");
  }
  await purgar();
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

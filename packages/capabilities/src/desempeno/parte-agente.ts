import type { Prisma } from "@opai/db";
import { rangoDelPeriodo } from "@opai/domain";
import { z } from "zod";

import { obtenerCapacidad } from "../registry";
import type { Contexto } from "../types";

export const parteAgenteSchema = z
  .object({
    acciones: z.number().int().describe("Acciones que quedaron en la auditoría a nombre de la persona."),
    porAgente: z.number().int().describe("De ellas, cuántas hizo un agente que actúa por la persona."),
    porcentaje: z.number().describe("Parte hecha por su agente, 0 a 100 (una decimal)."),
  })
  .nullable()
  .describe(
    "Qué parte de sus acciones del mes hizo su agente. El resultado se atribuye igual a la persona. null = la persona no tiene usuario en OPAI.",
  );
export type ParteAgente = z.infer<typeof parteAgenteSchema>;

/** Las lecturas auditadas (NÚCLEO-H) también quedan en la auditoría: no son acciones. */
const esAccion = (capability: string) => obtenerCapacidad(capability)?.efecto !== "lectura";

/**
 * Parte de las acciones de una persona hecha por su agente (ADR-094, CAR-312). Cuenta las escrituras
 * auditadas del mes: las del usuario directo y las de un agente «vía» ese usuario (API key o agente
 * interno). Agrupa por capacidad sin leer el detalle de ninguna fila.
 */
export async function parteAgente(
  ctx: Contexto,
  usuarioId: string | null,
  periodo: string,
  zona: string,
): Promise<ParteAgente> {
  if (!usuarioId) return null;
  const { desde, hasta } = rangoDelPeriodo(periodo, zona);
  const createdAt = { gte: desde, lt: hasta };
  // «Su agente» es una key personal de la persona (principal usuario) o su agente interno; las keys de
  // servicio, cuenta o persona también auditan vía su responsable, pero no actúan por ella.
  const keys = await ctx.db.apiKey.findMany({
    where: { userId: usuarioId, principalTipo: "usuario" },
    select: { id: true },
  });
  const suyo = [{ actorId: { in: keys.map((k) => k.id) } }, { actorId: { startsWith: "agente-interno:" } }];
  const contar = async (where: Prisma.AuditEventWhereInput) => {
    const grupos = await ctx.db.auditEvent.groupBy({
      by: ["capability"],
      where: { ...where, createdAt },
      _count: { _all: true },
    });
    return grupos.reduce((n, g) => n + (esAccion(g.capability) ? g._count._all : 0), 0);
  };
  const [propias, porAgente] = await Promise.all([
    contar({ actorType: "user", actorId: usuarioId }),
    contar({ actorType: "agent", viaUserId: usuarioId, OR: suyo }),
  ]);
  const acciones = propias + porAgente;
  const porcentaje = acciones === 0 ? 0 : Math.round((porAgente / acciones) * 1000) / 10;
  return { acciones, porAgente, porcentaje };
}

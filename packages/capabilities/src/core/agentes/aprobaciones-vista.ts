import { resumenParaMostrar } from "@opai/domain";
import { z } from "zod";

import { obtenerCapacidad } from "../../registry";
import type { Contexto } from "../../types";
import { iso } from "../comun";

// Forma pública de una aprobación (empresa o plataforma) y su vista desde las filas de empresa.

export const aprobacionSchema = z.object({
  id: z.string(),
  ambito: z
    .enum(["empresa", "plataforma"])
    .describe("plataforma: acción platform.*, en la cola de plataforma (solo con platformRole)."),
  apiKeyId: z.string().nullable(),
  agente: z.string(),
  via: z.string().nullable().describe("Persona responsable de la key (el agente actúa vía ella)."),
  riesgo: z.enum(["alto", "medio"]).describe("Alto: la capacidad es irreversible."),
  capability: z.string(),
  resumen: z.string(),
  input: z.unknown(),
  estado: z.enum(["pendiente", "aprobada", "rechazada", "vencida"]),
  venceEn: z.string(),
  resueltaPor: z.string().nullable(),
  resueltaEn: z.string().nullable(),
  motivo: z.string().nullable(),
  resultado: z.unknown(),
  creadaEn: z.string(),
});

type Fila = Awaited<ReturnType<Contexto["db"]["aprobacion"]["findFirstOrThrow"]>>;

export async function vistaAprobaciones(
  ctx: Contexto,
  filas: Fila[],
  precargado?: {
    keys: { id: string; nombre: string }[];
    miembros: { userId: string; user: { name: string } }[];
  },
) {
  const keys =
    precargado?.keys ??
    (await ctx.db.apiKey.findMany({
      where: { id: { in: [...new Set(filas.flatMap((f) => (f.apiKeyId ? [f.apiKeyId] : [])))] } },
      select: { id: true, nombre: true },
    }));
  const nombre = new Map(keys.map((k) => [k.id, k.nombre]));
  const miembros =
    precargado?.miembros ??
    (await ctx.db.membership.findMany({
      where: { userId: { in: [...new Set(filas.map((f) => f.viaUserId))] } },
      include: { user: true },
    }));
  const via = new Map(miembros.map((m) => [m.userId, m.user.name]));
  return filas.map((a) => ({
    id: a.id,
    ambito: "empresa" as const,
    apiKeyId: a.apiKeyId,
    agente: a.agenteInternoId
      ? "Agente interno"
      : (nombre.get(a.apiKeyId ?? "") ?? "Key eliminada"),
    via: via.get(a.viaUserId) ?? null,
    riesgo:
      obtenerCapacidad(a.capability)?.efecto === "irreversible"
        ? ("alto" as const)
        : ("medio" as const),
    capability: a.capability,
    resumen: resumenParaMostrar({
      resumen: a.resumen,
      capabilityId: a.capability,
      agente: a.agenteInternoId ? "Agente interno" : (nombre.get(a.apiKeyId ?? "") ?? "Un agente"),
      descripcion: obtenerCapacidad(a.capability)?.descripcion ?? null,
    }),
    input: a.input,
    estado: a.estado as "pendiente",
    venceEn: a.venceEn.toISOString(),
    resueltaPor: a.resueltaPor ?? null,
    resueltaEn: iso(a.resueltaEn),
    motivo: a.motivo ?? null,
    resultado: a.resultado ?? null,
    creadaEn: a.createdAt.toISOString(),
  }));
}

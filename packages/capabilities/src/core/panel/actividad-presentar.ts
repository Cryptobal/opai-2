import { z } from "zod";

import type { Contexto } from "../../types";
import { nombres } from "./actividad-actores";
import { visibleSinAnexos } from "./actividad-anexos";
import { visibleSinNoRecontratar } from "./actividad-no-recontratar";
import { ocultarPreferenciaNav } from "./actividad-preferencias-nav";
import { auditarHistorialSensible, redactarSensibles } from "./actividad-sensible";
import { cambios, frase } from "./actividad-texto";

export const itemActividadSchema = z.object({
  id: z.string(),
  cuando: z.string(),
  capability: z.string(),
  actor: z.object({ tipo: z.string(), nombre: z.string(), agente: z.boolean() }),
  via: z.string().nullable().describe("Usuario responsable cuando actuó un agente."),
  accion: z.string().describe('Frase legible: "creó el contacto Paula Riquelme".'),
  cambios: z.array(z.object({ campo: z.string(), valor: z.string() })),
  detalle: z.unknown().describe("Input auditado (sin datos sensibles)."),
  entidad: z.object({ tipo: z.string(), id: z.string() }).nullable(),
  extra: z.unknown().describe("Resto del registro: clave de idempotencia, resultado de intentos…"),
});

export type FilaAuditoria = {
  id: string;
  createdAt: Date;
  capability: string;
  actorType: string;
  actorId: string | null;
  viaUserId: string | null;
  entityType: string | null;
  entityId: string | null;
  payload: unknown;
};

/**
 * Convierte filas de `core.audit_events` (ya acotadas por quien llama) en la página de actividad:
 * oculta lo que el actor no puede ver, redacta lo sensible, audita el historial sensible revelado y
 * resuelve los nombres. `filas` trae `limite + 1` para saber si hay otra página.
 */
export async function presentarActividad(
  ctx: Contexto,
  filas: readonly FilaAuditoria[],
  limite: number,
  capacidad: "core.actividad.list" | "core.hilo.actividad",
) {
  const leidas = filas.slice(0, limite);
  const visibleAnexos = await visibleSinAnexos(ctx, leidas);
  const visibleMarca = visibleSinNoRecontratar(ctx);
  const pagina = leidas.filter(
    (f) => visibleAnexos(f) && visibleMarca(f) && !ocultarPreferenciaNav(f),
  );
  await auditarHistorialSensible(ctx, pagina, capacidad);
  const quien = await nombres(
    ctx,
    pagina
      .flatMap((f) => [f.actorType === "user" ? f.actorId : null, f.viaUserId])
      .filter((x): x is string => !!x),
    pagina.filter((f) => f.actorType === "agent" && f.actorId).map((f) => f.actorId as string),
  );
  return {
    items: pagina.map((f) => {
      const { input: entradaAuditada, ...extra } = (f.payload ?? {}) as {
        input?: Record<string, unknown>;
      };
      const entrada = redactarSensibles(ctx, f.capability, entradaAuditada ?? {});
      const agente = f.actorType === "agent";
      return {
        id: f.id,
        cuando: f.createdAt.toISOString(),
        capability: f.capability,
        actor: {
          tipo: f.actorType,
          nombre:
            quien.get(f.actorId ?? "") ??
            (agente ? "Agente" : f.actorType === "system" ? "OPAI" : "Usuario"),
          agente,
        },
        via: f.viaUserId ? (quien.get(f.viaUserId) ?? null) : null,
        accion: frase(f.capability, entrada),
        cambios: cambios(entrada),
        detalle: entrada,
        entidad: f.entityType && f.entityId ? { tipo: f.entityType, id: f.entityId } : null,
        extra,
      };
    }),
    siguiente: filas.length > limite ? (leidas.at(-1)?.id ?? null) : null,
  };
}

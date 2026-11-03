import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

/** Tope diario de escrituras de agente por solicitud (crear + enriquecer) por API key. */
export const TOPE_ESCRITURAS_AGENTE_DIA = 500;

const CAPS_CONTEO = [
  "comercial.solicitudes.create",
  "comercial.solicitudes.enriquecer",
] as const;

/** Rechaza si la key de agente superó el tope de escrituras del día (zona UTC). */
export async function exigirTopeEscriturasAgente(ctx: Contexto) {
  if (ctx.actor.tipo !== "agent" || ctx.actor.interno) return;
  const desde = new Date();
  desde.setUTCHours(0, 0, 0, 0);
  const n = await ctx.db.auditEvent.count({
    where: {
      tenantId: ctx.tenantId,
      actorType: "agent",
      actorId: ctx.actor.id,
      capability: { in: [...CAPS_CONTEO] },
      createdAt: { gte: desde },
    },
  });
  if (n >= TOPE_ESCRITURAS_AGENTE_DIA) {
    throw reglaDeNegocio(
      `Este agente alcanzó el tope de ${TOPE_ESCRITURAS_AGENTE_DIA} escrituras de solicitudes por día.`,
    );
  }
}

export const CAMPOS_PROPUESTOS = [
  "nombre",
  "empresa",
  "email",
  "telefono",
  "rut",
  "comuna",
  "servicio",
  "fuente",
  "asunto",
] as const;

export type CampoPropuesto = (typeof CAMPOS_PROPUESTOS)[number];

export function fusionarCamposPropuestos(
  actuales: string[],
  campos: Partial<Record<CampoPropuesto, unknown>>,
): string[] {
  const set = new Set(actuales);
  for (const k of CAMPOS_PROPUESTOS) {
    const v = campos[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") set.add(k);
  }
  return [...set];
}

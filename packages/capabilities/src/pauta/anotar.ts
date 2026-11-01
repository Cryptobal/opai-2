import type { TenantTx } from "@opai/db";

import type { Contexto } from "../types";
import { aFechaDb } from "./comun";

export type Anotacion = {
  instalacionId: string;
  puestoId: string;
  accion:
    | "serie_fijada"
    | "excepcion_creada"
    | "excepcion_anulada"
    | "cobertura_confirmada"
    | "cobertura_deshacer"
    | "marca_registrada"
    | "reemplazo_asignado"
    | "refuerzo_agregado";
  desde: string;
  hasta: string;
  /** Datos estructurados del cambio (tipo, patrón, ids). Sin RUT ni sueldos. */
  detalle: Record<string, string | number | null>;
};

/** Quién actúa, para el historial: el usuario, o el responsable de la key si es un agente. */
export function actorDeHistorial(ctx: Contexto): { tipo: string; id: string | null } {
  const a = ctx.actor;
  return { tipo: a.tipo, id: a.tipo === "agent" ? a.viaUserId : (a.id ?? null) };
}

/** Agrega una línea al historial de la pauta en la misma transacción del cambio (append-only). */
export async function anotar(tx: TenantTx, ctx: Contexto, a: Anotacion): Promise<void> {
  const actor = actorDeHistorial(ctx);
  await tx.historialPauta.create({
    data: {
      tenantId: ctx.tenantId,
      instalacionId: a.instalacionId,
      puestoId: a.puestoId,
      accion: a.accion,
      actorTipo: actor.tipo,
      actorId: actor.id,
      fechaDesde: aFechaDb(a.desde),
      fechaHasta: aFechaDb(a.hasta),
      detalle: { ...a.detalle, actorNombre: ctx.usuario?.nombre ?? null },
    },
  });
}

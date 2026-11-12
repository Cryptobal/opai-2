import { reglaAplicable } from "@opai/domain";

import { reglaDeFila } from "../core/aprobaciones-reglas/comun";
import type { Capacidad, Contexto, OpcionesEjecucion, Resultado } from "../types";
import { aprobacion, controlAgente } from "./control";

/** La regla de la empresa que exige aprobar esta ejecución (CAR-252), o null. */
async function reglaQueAplica(ctx: Contexto, c: Capacidad, entrada: unknown): Promise<string | null> {
  if (!c.aprobable || !ctx.conTenant) return null;
  const filas = await ctx.db.reglaAprobacion.findMany({
    where: { accion: c.aprobable.accion, activa: true },
  });
  if (!filas.length) return null;
  // Si el monto no se puede calcular, vale como desconocido: ante la duda se pide aprobación.
  const monto = c.aprobable.monto ? await c.aprobable.monto(ctx, entrada).catch(() => null) : null;
  return reglaAplicable(filas.map(reglaDeFila), c.aprobable.accion, monto)?.id ?? null;
}

/**
 * Aprobación antes de ejecutar (ADR-032 y CAR-252). Las reglas de la empresa valen para personas y
 * agentes; sin regla, los agentes siguen con su autonomía de siempre. La ejecución que resulta de
 * aprobar (`auditoriaExtra.aprobacionId`) y las vistas previas no vuelven a pedir aprobación.
 */
export async function controlAprobacion(
  ctx: Contexto,
  c: Capacidad,
  entrada: unknown,
  opciones: OpcionesEjecucion,
): Promise<Resultado | null> {
  if (opciones.dryRun || opciones.auditoriaExtra?.["aprobacionId"]) return null;
  const reglaId = await reglaQueAplica(ctx, c, entrada);
  if (ctx.actor.tipo === "agent") return controlAgente(ctx, c, entrada, opciones, reglaId);
  if (reglaId && ctx.actor.tipo === "user") return aprobacion(ctx, c, entrada, opciones, reglaId);
  return null;
}

// Indicador corto del seguimiento para las tarjetas del tablero (spec §4, CAR-160). Dos consultas
// para todo el tablero: seguimientos vivos de esos negocios y sus pasos. La regla vive en el dominio.
import { z } from "zod";

import { type EstadoPaso, type IndicadorSeguimiento, indicadorSeguimiento } from "@opai/domain";

import type { Contexto } from "../types";
import { zonaDe } from "./seguimiento-comun";

export const indicadorSchema = z
  .object({ texto: z.string(), tono: z.enum(["neutro", "info", "warning", "danger"]) })
  .nullable()
  .describe("Seguimiento del negocio en corto: «Seguimiento 2 de 4 · hoy», «Vencido», «Pausado» o «Con fallos».");

/** Indicador por negocio (solo los que tienen un seguimiento activo o pausado con algo que mostrar). */
export async function indicadoresDeNegocios(ctx: Contexto, negocioIds: string[], ahora = new Date()): Promise<Map<string, IndicadorSeguimiento>> {
  const mapa = new Map<string, IndicadorSeguimiento>();
  if (!negocioIds.length) return mapa;
  const vivos = await ctx.db.seguimiento.findMany({
    where: { negocioId: { in: negocioIds }, estado: { in: ["activo", "pausado"] } },
    select: { id: true, negocioId: true, estado: true },
  });
  if (!vivos.length) return mapa;
  const [pasos, zona] = await Promise.all([
    ctx.db.seguimientoPaso.findMany({ where: { seguimientoId: { in: vivos.map((s) => s.id) } }, select: { seguimientoId: true, orden: true, estado: true, programadoEn: true } }),
    zonaDe(ctx),
  ]);
  for (const s of vivos) {
    const propios = pasos.filter((p) => p.seguimientoId === s.id).map((p) => ({ ...p, estado: p.estado as EstadoPaso }));
    const ind = indicadorSeguimiento(s.estado, propios, ahora, zona);
    if (ind) mapa.set(s.negocioId, ind);
  }
  return mapa;
}

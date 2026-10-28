import type { TenantTx } from "@opai/db";
import type { z } from "zod";

import type { Contexto } from "../types";
import { TONOS_ETAPA } from "./dominio";
import { embudoPorDefecto, type etapaSchema } from "./comun";

export type FilaEtapa = {
  id: string;
  nombre: string;
  orden: number;
  tipo: string;
  probabilidad: number;
  tono: string;
  exige: string[];
  activa: boolean;
};

/** Una etapa tal como la devuelven las capacidades de configuración. */
export const vistaEtapa = (e: FilaEtapa): z.input<typeof etapaSchema> => ({
  id: e.id,
  nombre: e.nombre,
  orden: e.orden,
  tipo: e.tipo as z.infer<typeof etapaSchema>["tipo"],
  probabilidad: e.probabilidad,
  tono: ((TONOS_ETAPA as readonly string[]).includes(e.tono) ? e.tono : "neutral") as z.infer<
    typeof etapaSchema
  >["tono"],
  exige: e.exige,
  activa: e.activa,
});

/** Máximo de etapas de un embudo (el orden se valida entre 0 y 99). */
export const MAX_ETAPAS = 30;
/** Desplazamiento de la primera fase: deja libres los órdenes finales sin chocar con el único. */
export const TEMPORAL = 1000;

/**
 * Renumera las etapas del embudo en dos fases dentro de la transacción: el índice único
 * `(tenant, embudo, orden)` no es diferible, así que primero lleva las existentes a órdenes
 * temporales (1000 + i) y después cada una a su orden final (su índice en `ids`). Un `null` en
 * `ids` es la etapa nueva, que `crear` inserta ya en su orden final. Sin migración ni DEFERRABLE.
 */
export async function renumerar<T>(
  tx: TenantTx,
  ids: readonly (string | null)[],
  crear?: (orden: number) => Promise<T>,
): Promise<T | undefined> {
  const existentes = ids.filter((id): id is string => id !== null);
  for (const [i, id] of existentes.entries()) {
    await tx.etapa.update({ where: { id }, data: { orden: TEMPORAL + i } });
  }
  let creada: T | undefined;
  for (const [i, id] of ids.entries()) {
    if (id === null) creada = await crear?.(i);
    else await tx.etapa.update({ where: { id }, data: { orden: i } });
  }
  return creada;
}

/** Etapas del embudo por defecto en su orden actual (abiertas primero; ganada y perdida al final). */
export async function etapasDelEmbudo(ctx: Contexto) {
  const embudo = await embudoPorDefecto(ctx);
  const etapas = await ctx.db.etapa.findMany({
    where: { embudoId: embudo.id },
    orderBy: { orden: "asc" },
  });
  return { embudo, etapas };
}

/** La ganada y la perdida van siempre al final, en el orden en que estaban (R26). */
export const cerradas = (etapas: readonly FilaEtapa[]) =>
  etapas.filter((e) => e.tipo !== "abierta");

export async function emitirEmbudo(ctx: Contexto, tx: TenantTx, embudoId: string, cambio: string) {
  await ctx.eventos.emitir(tx, {
    tipo: "comercial.embudo.actualizado",
    entidadTipo: "embudo",
    entidadId: embudoId,
    payload: { cambio },
  });
}

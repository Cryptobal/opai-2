import { z } from "zod";

import { fechaCorte } from "@opai/domain";

import { defineTrabajo } from "../../trabajos/registro";
import type { Contexto } from "../../types";
import { diasDeRegla, politicaActiva } from "./retencion-politica";
import { EJECUTORES, type Ejecutor, exclusionesAbiertas } from "./retencion-reglas";

const LOTE = 100;
const MAX_LOTES = 20;

type Resultado = { tabla: string; modo: "simulacion" | "aplicada"; filas: number };

async function correr(
  ctx: Contexto,
  e: Ejecutor,
  dias: number,
  ahora: Date,
  activa: boolean,
): Promise<Resultado | null> {
  const corte = fechaCorte(ahora, dias);
  if (!corte) return null;
  const ex = await exclusionesAbiertas(ctx);
  let filas = 0;
  if (!activa) {
    filas = await e.contar(ctx, corte, ex);
  } else {
    for (let i = 0; i < MAX_LOTES; i++) {
      const ids = await e.lote(ctx, corte, ex, LOTE, ahora, dias);
      if (ids.length === 0) break;
      const n = await ctx.transaccion((tx) => e.aplicar(tx, ids, ahora, corte));
      filas += n;
      if (n === 0) break; // nada cambió: no repetir el mismo lote
    }
  }
  if (filas === 0) return null;
  const modo = activa ? "aplicada" : "simulacion";
  await ctx.transaccion(async (tx) => {
    await tx.retencionEjecucion.create({
      data: {
        tenantId: ctx.tenantId,
        tabla: e.regla.tabla,
        accion: e.regla.accion,
        modo,
        origen: "trabajo",
        dias,
        corte,
        filas,
      },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "core.cumplimiento.retencion_aplicada",
      entidadTipo: "retencion",
      payload: { tabla: e.regla.tabla, accion: e.regla.accion, modo, filas },
    });
  });
  return { tabla: e.regla.tabla, modo, filas };
}

/**
 * Política de retención (Ley 21.719, Brief 07d §4.5, ADR-029): a diario recorre las reglas del
 * catálogo y anonimiza o elimina lo vencido. Con la política apagada (por defecto) solo simula y
 * registra cuántas filas habría tocado. Respeta los hechos regulados (no tiene regla sobre ellos) y
 * no toca a quien tiene una solicitud del titular abierta. El registro lleva contadores, nunca datos.
 */
export const trabajoRetencion = defineTrabajo({
  tipo: "core.cumplimiento.retencion",
  descripcion:
    "Aplica a diario la política de retención de datos personales: anonimiza o elimina lo vencido, o solo simula si la política no está activa.",
  payload: z.object({ dia: z.string() }),
  periodicidad: "diaria",
  async handler(ctx) {
    const activa = await politicaActiva(ctx);
    const ahora = new Date();
    const resultados: Resultado[] = [];
    for (const e of EJECUTORES) {
      const r = await correr(ctx, e, await diasDeRegla(ctx, e.regla), ahora, activa);
      if (r) resultados.push(r);
    }
    return { activa, resultados };
  },
});

export const trabajosCumplimiento = [trabajoRetencion];

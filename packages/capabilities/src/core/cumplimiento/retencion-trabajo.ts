import { z } from "zod";

import { fechaCorte } from "@opai/domain";

import { defineTrabajo } from "../../trabajos/registro";
import type { Contexto } from "../../types";
import { diasDeRegla, politicaActiva } from "./retencion-politica";
import { EJECUTORES, type Ejecutor, exclusionesAbiertas } from "./retencion-reglas";

const LOTE = 100;
const MAX_LOTES = 20; // tope de la corrida: 2.000 filas por regla y día (la simulación cuenta igual)

type Resultado = { tabla: string; modo: "simulacion" | "aplicada"; filas: number };

/**
 * Aplica o simula una regla. Cada lote se confirma JUNTO con su fila de registro y su evento, en la
 * misma transacción: si un lote posterior falla, lo ya hecho (irreversible) queda registrado, y si
 * el registro falla el lote se revierte. Exportada para probar ese contrato.
 */
export async function correrRegla(
  ctx: Contexto,
  e: Ejecutor,
  dias: number,
  ahora: Date,
  activa: boolean,
): Promise<Resultado | null> {
  const corte = fechaCorte(ahora, dias);
  if (!corte) return null;
  const ex = await exclusionesAbiertas(ctx);
  const modo = activa ? "aplicada" : "simulacion";
  const fila = (filas: number) => ({
    tenantId: ctx.tenantId,
    tabla: e.regla.tabla,
    accion: e.regla.accion,
    modo,
    origen: "trabajo",
    dias,
    corte,
    filas,
  });
  let total = 0;
  if (!activa) {
    total = await e.contar(ctx, corte, ex, LOTE * MAX_LOTES);
    if (total > 0) await ctx.transaccion((tx) => tx.retencionEjecucion.create({ data: fila(total) }));
  } else {
    let despues: string | null = null;
    for (let i = 0; i < MAX_LOTES; i++) {
      const l = await e.lote(ctx, corte, ex, LOTE, despues, ahora, dias);
      if (l.ultimo === null) break; // no quedan filas que leer
      despues = l.ultimo;
      const ids = l.ids;
      if (ids.length === 0) continue; // lote leído sin elegibles: el cursor ya avanzó
      const n = await ctx.transaccion(async (tx) => {
        const hechas = await e.aplicar(tx, ids, ahora, corte);
        if (hechas === 0) return 0;
        await tx.retencionEjecucion.create({ data: fila(hechas) });
        await ctx.eventos.emitir(tx, {
          tipo: "core.cumplimiento.retencion_aplicada",
          entidadTipo: "retencion",
          payload: { tabla: e.regla.tabla, accion: e.regla.accion, modo, filas: hechas },
        });
        return hechas;
      });
      // Un lote sin cambios (p. ej. todos con solicitud abierta) ya no detiene la regla (§21):
      // el cursor avanza al siguiente y el tope de lotes acota la corrida.
      total += n;
    }
  }
  return total === 0 ? null : { tabla: e.regla.tabla, modo, filas: total };
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
    const fallidas: string[] = [];
    for (const e of EJECUTORES) {
      // Una regla que falla no impide las demás; al final el trabajo falla para que se reintente.
      try {
        const r = await correrRegla(ctx, e, await diasDeRegla(ctx, e.regla), ahora, activa);
        if (r) resultados.push(r);
      } catch {
        fallidas.push(e.regla.tabla);
      }
    }
    if (fallidas.length) throw new Error(`Falló la retención de: ${fallidas.join(", ")}.`);
    return { activa, resultados };
  },
});

export const trabajosCumplimiento = [trabajoRetencion];

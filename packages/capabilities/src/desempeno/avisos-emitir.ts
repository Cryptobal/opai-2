// Eventos de los avisos bajo la meta (ADR-094, CAR-312, CAR-379): uno por persona bajo la meta y uno por
// jefatura directa: la de su ficha más la que da la jerarquía de cargos (sin duplicar). Usa la jefatura de hoy.
import type { TenantTx } from "@opai/db";

import { directasPorJefatura } from "../core/jefatura/empresa";
import type { Contexto } from "../types";
import type { FilaCierre } from "./cierre-calculo";

export const EVENTO_PERSONA_BAJO_META = "desempeno.resultado.bajo_meta";
export const EVENTO_EQUIPO_BAJO_META = "desempeno.equipo.bajo_meta";

const bajoMeta = (f: FilaCierre) => f.puntaje !== null && f.puntaje < 100;

/** Emite los avisos del cierre dentro de su transacción (outbox, ADR-029). Quien cierra mira antes el ajuste. */
export async function emitirBajoMeta(
  ctx: Contexto,
  tx: TenantTx,
  periodo: string,
  filas: FilaCierre[],
) {
  const porJefe = new Map<string, string[]>();
  const sumar = (jefe: string, persona: string) => {
    const l = porJefe.get(jefe) ?? [];
    if (!l.includes(persona)) porJefe.set(jefe, [...l, persona]);
  };
  const bajo = filas.filter(bajoMeta);
  // Jefatura directa por cargo (CAR-314): quien no tiene jefe en su ficha igual avisa a quien lo tiene a cargo.
  const directas = bajo.length
    ? await directasPorJefatura({ ...ctx, db: tx })
    : new Map<string, Set<string>>();
  for (const [jefe, reportan] of directas)
    for (const f of bajo) if (reportan.has(f.personaId)) sumar(jefe, f.personaId);
  for (const f of bajo) {
    await ctx.eventos.emitir(tx, {
      tipo: EVENTO_PERSONA_BAJO_META,
      entidadTipo: "persona",
      entidadId: f.personaId,
      payload: { periodo, scorecardId: f.scorecardId },
    });
    if (f.jefePersonaId) sumar(f.jefePersonaId, f.personaId);
  }
  for (const [jefe, personaIds] of porJefe) {
    await ctx.eventos.emitir(tx, {
      tipo: EVENTO_EQUIPO_BAJO_META,
      entidadTipo: "persona",
      entidadId: jefe,
      payload: { periodo, personaIds },
    });
  }
}

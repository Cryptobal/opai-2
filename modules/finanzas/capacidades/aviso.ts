import type { Contexto } from "@opai/capabilities";

import { lunesDe } from "../domain";
import { aFecha, aIso, ajustesDe } from "./util";

/** Emite evento in-app cuando una semana futura queda bajo el umbral del aviso (CAR-136). */
export async function sincronizarAvisos(
  ctx: Contexto,
  ajustes: Awaited<ReturnType<typeof ajustesDe>>,
  semanas: { semana: string; saldoFinal: number }[],
) {
  if (!ajustes.avisoActivo) return [];
  const hoy = lunesDe(new Date().toISOString().slice(0, 10));
  const candidatas = semanas.filter(
    (s) => s.semana >= hoy && s.saldoFinal < (ajustes.avisoUmbral || 0),
  );
  const emitidos = new Map(
    (
      await ctx.db.flujoAvisoEmitido.findMany({
        where: { semana: { in: candidatas.map((c) => aFecha(c.semana)) } },
      })
    ).map((e) => [aIso(e.semana), e]),
  );
  const avisos = [];
  for (const c of candidatas) {
    if (!emitidos.has(c.semana)) {
      await ctx.transaccion(async (tx) => {
        const r = await tx.flujoAvisoEmitido.create({
          data: {
            tenantId: ctx.tenantId,
            semana: aFecha(c.semana),
            saldoProyectado: c.saldoFinal,
          },
        });
        await ctx.eventos.emitir(tx, {
          tipo: "finanzas.flujo.saldo_negativo_avisado",
          entidadTipo: "flujoAvisoEmitido",
          entidadId: r.id,
          payload: { semana: c.semana, saldo: c.saldoFinal },
        });
      });
    }
    avisos.push({ semana: c.semana, saldoFinal: c.saldoFinal, emitido: true });
  }
  return avisos;
}

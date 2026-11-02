import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";
import { randomUUID } from "node:crypto";

import { calcularPlanilla, lunesDe, semanasDesde } from "../domain";
import { aFecha, aIso, cargarFlujo, vistaAjustes } from "./util";
import type { ajustesDe } from "./util";

type SemanaSaldo = { semana: string; saldoFinal: number };

/** Saldos proyectados del horizonte configurado (solo lectura). */
export async function semanasProyectadas(
  ctx: Contexto,
  ajustes: Awaited<ReturnType<typeof ajustesDe>>,
  tx?: TenantTx,
): Promise<SemanaSaldo[]> {
  const lista = semanasDesde(ajustes.desde, ajustes.horizonteSemanas);
  const primero = lista[0];
  if (!primero) return [];
  const hasta = lista.at(-1) as string;
  const db = tx ?? ctx.db;
  const { dominio, celdasDom } = await cargarFlujo(ctx, ajustes.desde, hasta, tx);
  const previas =
    ajustes.desde < primero
      ? await db.flujoCelda.findMany({
          where: {
            semana: {
              lt: aFecha(primero),
              gte: aFecha(ajustes.desde),
            },
          },
        })
      : [];
  const saldoPrevio = previas.reduce((s, c) => {
    const f = dominio.find((x) => x.id === c.filaId);
    return f ? s + (f.seccion === "ingreso" ? c.monto : -c.monto) : s;
  }, ajustes.saldoInicial);
  return calcularPlanilla({
    saldoInicial: saldoPrevio,
    umbral: ajustes.umbral,
    semanas: lista,
    filas: dominio,
    celdas: celdasDom,
  }).map((s) => ({ semana: s.semana, saldoFinal: s.saldoFinal }));
}

/** Estado del aviso para la planilla (lectura pura, sin escribir). */
export async function avisoLeido(
  ctx: Contexto,
  ajustes: Awaited<ReturnType<typeof ajustesDe>>,
  semanasOut: SemanaSaldo[],
) {
  if (!ajustes.avisoActivo) return [];
  const hoy = lunesDe(new Date().toISOString().slice(0, 10));
  const umbral = ajustes.avisoUmbral;
  const candidatas = semanasOut.filter((s) => s.semana >= hoy && s.saldoFinal < umbral);
  const emitidos = new Set(
    (
      await ctx.db.flujoAvisoEmitido.findMany({
        where: { semana: { in: candidatas.map((c) => aFecha(c.semana)) } },
      })
    ).map((e) => aIso(e.semana)),
  );
  return candidatas.map((c) => ({
    semana: c.semana,
    saldoFinal: c.saldoFinal,
    emitido: emitidos.has(c.semana),
  }));
}

/** Tras una escritura que puede cambiar saldos: inserta avisos idempotentes (respeta dry_run). */
export async function sincronizarAvisosEnTx(
  ctx: Contexto,
  tx: TenantTx,
  opts: { dryRun: boolean },
): Promise<void> {
  if (opts.dryRun) return;
  const row = await tx.flujoAjustes.findFirst({});
  if (!row?.avisoActivo) return;
  const ajustes = vistaAjustes(row);
  const semanas = await semanasProyectadas(ctx, ajustes, tx);
  const hoy = lunesDe(new Date().toISOString().slice(0, 10));
  const umbral = ajustes.avisoUmbral;
  for (const s of semanas.filter((x) => x.semana >= hoy && x.saldoFinal < umbral)) {
    try {
      const r = await tx.flujoAvisoEmitido.create({
        data: {
          id: randomUUID(),
          tenantId: ctx.tenantId,
          semana: aFecha(s.semana),
          saldoProyectado: BigInt(s.saldoFinal),
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.saldo_negativo_avisado",
        entidadTipo: "flujoAvisoEmitido",
        entidadId: r.id,
        payload: { semana: s.semana, saldo: s.saldoFinal },
      });
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") continue;
      throw e;
    }
  }
}

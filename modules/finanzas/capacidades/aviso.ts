import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";
import { randomUUID } from "node:crypto";

import { desdeVentana, serieSaldos } from "./serie-saldos";
import { aFecha, aIso, lunesHoy, vistaAjustes } from "./util";
import type { ajustesDe } from "./util";

type SemanaSaldo = { semana: string; saldoFinal: number };

/** Saldos proyectados del horizonte configurado (solo lectura). */
export async function semanasProyectadas(
  ctx: Contexto,
  ajustes: Awaited<ReturnType<typeof ajustesDe>>,
  tx?: TenantTx,
): Promise<SemanaSaldo[]> {
  const hoy = lunesHoy();
  const { calculo } = await serieSaldos(
    ctx,
    ajustes,
    desdeVentana(ajustes, hoy, hoy),
    ajustes.horizonteSemanas,
    tx,
  );
  return calculo.map((s) => ({ semana: s.semana, saldoFinal: s.saldoFinal }));
}

/** Estado del aviso para la planilla (lectura pura, sin escribir). */
export async function avisoLeido(
  ctx: Contexto,
  ajustes: Awaited<ReturnType<typeof ajustesDe>>,
  semanasOut: SemanaSaldo[],
) {
  if (!ajustes.avisoActivo) return [];
  const hoy = lunesHoy();
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
  const hoy = lunesHoy();
  const umbral = ajustes.avisoUmbral;
  const candidatas = semanas.filter((x) => x.semana >= hoy && x.saldoFinal < umbral);
  // Re-aviso (hallazgo 14): si la semana se recuperó, se libera el registro para que pueda avisar de nuevo.
  const vigentes = await tx.flujoAvisoEmitido.findMany({ where: { semana: { gte: aFecha(hoy) } } });
  const siguenBajo = new Set(candidatas.map((c) => c.semana));
  const recuperadas = vigentes.filter((v) => !siguenBajo.has(aIso(v.semana)));
  if (recuperadas.length)
    await tx.flujoAvisoEmitido.deleteMany({ where: { id: { in: recuperadas.map((v) => v.id) } } });
  for (const v of vigentes) {
    const c = candidatas.find((x) => x.semana === aIso(v.semana));
    if (c && Number(v.saldoProyectado) !== c.saldoFinal)
      await tx.flujoAvisoEmitido.update({
        where: { id: v.id },
        data: { saldoProyectado: BigInt(c.saldoFinal) },
      });
  }
  if (!candidatas.length) return;

  const fechas = candidatas.map((c) => aFecha(c.semana));
  const ya = new Set(
    (
      await tx.flujoAvisoEmitido.findMany({
        where: { semana: { in: fechas } },
        select: { semana: true },
      })
    ).map((e) => aIso(e.semana)),
  );
  const nuevas = candidatas.filter((c) => !ya.has(c.semana));
  if (!nuevas.length) return;

  const data = nuevas.map((s) => ({
    id: randomUUID(),
    tenantId: ctx.tenantId,
    semana: aFecha(s.semana),
    saldoProyectado: BigInt(s.saldoFinal),
  }));

  const { count } = await tx.flujoAvisoEmitido.createMany({ data, skipDuplicates: true });
  if (!count) return;

  const insertados = await tx.flujoAvisoEmitido.findMany({
    where: { id: { in: data.map((d) => d.id) } },
  });
  for (const r of insertados) {
    const semana = aIso(r.semana);
    const s = nuevas.find((n) => n.semana === semana);
    if (!s) continue;
    await ctx.eventos.emitir(tx, {
      tipo: "finanzas.flujo.saldo_negativo_avisado",
      entidadTipo: "flujoAvisoEmitido",
      entidadId: r.id,
      payload: { semana: s.semana, saldo: s.saldoFinal },
    });
  }
}

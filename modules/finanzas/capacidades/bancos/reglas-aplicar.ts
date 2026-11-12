import type { Contexto } from "@opai/capabilities";
import type { Prisma, TenantTx } from "@opai/db";
import { primeraReglaQueCalza, reglaConciliaSola } from "@opai/domain";

import { sincronizarAvisosEnTx } from "../aviso";
import { montoDe } from "./esquemas";
import { reglaEvaluable, type ReglaConDestino } from "./reglas-esquemas";

export type ResultadoReglas = { conciliados: number; sugeridos: number };

/** Reglas activas con destino en una fila activa, con la sección de esa fila (ingreso o egreso). */
async function reglasConFila(tx: TenantTx): Promise<(ReglaConDestino & { seccion: string })[]> {
  const filas = await tx.reglaConciliacion.findMany({ where: { activa: true, flujoFilaId: { not: null } } });
  if (!filas.length) return [];
  const destinos = await tx.flujoFila.findMany({
    where: { id: { in: filas.flatMap((r) => (r.flujoFilaId ? [r.flujoFilaId] : [])) }, activa: true },
    select: { id: true, seccion: true },
  });
  const seccion = new Map(destinos.map((f) => [f.id, f.seccion]));
  // La cuenta contable pudo desactivarse después de guardar la regla: en ese caso se concilia solo a la fila.
  const cuentaIds = filas.flatMap((r) => (r.cuentaContableId ? [r.cuentaContableId] : []));
  const vigentes = new Set(
    cuentaIds.length
      ? (await tx.cuentaContable.findMany({ where: { id: { in: cuentaIds }, activa: true, aceptaAsientos: true }, select: { id: true } })).map((c) => c.id)
      : [],
  );
  return filas.flatMap((r) => {
    const e = reglaEvaluable(r);
    const s = r.flujoFilaId ? seccion.get(r.flujoFilaId) : undefined;
    return e && s ? [{ ...e, seccion: s, cuentaContableId: e.cuentaContableId && vigentes.has(e.cuentaContableId) ? e.cuentaContableId : null }] : [];
  });
}

/**
 * Solo evalúa movimientos «pendiente»: los «sugeridos» ya esperan a una persona. Una conciliación deshecha
 * vuelve a «pendiente» y, si una regla exacta calza, la próxima evaluación la concilia de nuevo.
 * Evalúa las reglas sobre movimientos pendientes (ADR-074): con monto exacto y referencia igual concilia
 * contra la fila de la regla y deja la regla en la explicación; con cualquier otro calce lo marca
 * «sugerido» para que una persona confirme. Nunca toca movimientos por autorizar, conciliados ni ignorados.
 * Corre dentro de la transacción de quien importa, así el movimiento y su conciliación entran juntos.
 */
export async function aplicarReglasBanco(
  ctx: Contexto,
  tx: TenantTx,
  filtro: { movimientoIds?: string[]; cuentaId?: string; simular?: boolean },
): Promise<ResultadoReglas> {
  const reglas = await reglasConFila(tx);
  if (!reglas.length) return { conciliados: 0, sugeridos: 0 };
  const movs = await tx.movimientoBancario.findMany({
    where: {
      estado: "pendiente",
      ...(filtro.movimientoIds ? { id: { in: filtro.movimientoIds } } : {}),
      ...(filtro.cuentaId ? { cuentaId: filtro.cuentaId } : {}),
    },
    select: { id: true, monto: true, glosa: true, referencia: true },
  });
  let conciliados = 0;
  let sugeridos = 0;
  for (const m of movs) {
    const mov = { monto: montoDe(m.monto), glosa: m.glosa, referencia: m.referencia };
    const seccion = mov.monto > 0 ? "ingreso" : "egreso";
    const regla = primeraReglaQueCalza(
      reglas.filter((r) => r.seccion === seccion),
      mov,
    );
    if (!regla?.flujoFilaId) continue;
    if (filtro.simular) {
      if (reglaConciliaSola(regla, mov)) conciliados += 1;
      else sugeridos += 1;
      continue;
    }
    if (!reglaConciliaSola(regla, mov)) {
      const r = await tx.movimientoBancario.updateMany({ where: { id: m.id, estado: "pendiente" }, data: { estado: "sugerido" } });
      sugeridos += r.count;
      continue;
    }
    const r = await tx.movimientoBancario.updateMany({ where: { id: m.id, estado: "pendiente" }, data: { estado: "conciliado" } });
    if (r.count !== 1) continue;
    await tx.conciliacionBanco.create({
      data: {
        tenantId: ctx.tenantId,
        movimientoId: m.id,
        tipoEnlace: "flujo_fila",
        enlaceId: regla.flujoFilaId,
        cuentaContableId: regla.cuentaContableId,
        monto: BigInt(Math.abs(mov.monto)),
        activa: true,
        propuesta: false,
        confirmada: true,
        explicacion: { regla: { id: regla.id, nombre: regla.nombre } } satisfies Prisma.InputJsonValue,
        createdById: null,
      },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "finanzas.banco.conciliacion_confirmada",
      entidadTipo: "movimientoBancario",
      entidadId: m.id,
      payload: { reglaId: regla.id, automatica: true },
    });
    conciliados += 1;
  }
  if (!filtro.simular && conciliados + sugeridos > 0) await sincronizarAvisosEnTx(ctx, tx, { dryRun: false });
  return { conciliados, sugeridos };
}

// Ingresos proyectados de las programaciones activas para el flujo de caja (BRIEF-26 · CAR-159).
// Solo los períodos que todavía no tienen corrida: cuando hay borrador, manda el DTE (sin doble conteo).
import {
  type IngresoProyectadoDesdeDte,
  periodosProgramacion,
  vencimientoPago,
} from "@opai/domain";

import { dia, hoy } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { agendaDe, desdeRecuperacion } from "./ventas-programacion-agenda";
import { calcularPeriodo } from "./ventas-programacion-calculo";
import { ufCentavosUltima } from "./ventas-programacion-uf";

export async function ingresosDeProgramaciones(
  ctx: Contexto,
  hasta: string,
  /** Fecha esperada del cobro de un período: (emisión, vencimiento, cliente) → aaaa-mm-dd. */
  fechaCobro: (emision: string, vencimiento: string, cuentaId: string) => string,
  semanaDe: (iso: string) => string,
): Promise<IngresoProyectadoDesdeDte[]> {
  const progs = await ctx.db.ventasProgramacion.findMany({
    where: { activa: true, cuentaId: { not: null } },
    include: { lineas: { orderBy: { orden: "asc" } } },
    take: 200,
  });
  if (!progs.length) return [];
  // Consultas constantes: UF, corte y corridas de una vez (sin N+1 por programación ni por período).
  const ufEstimada = await ufCentavosUltima(ctx.db);
  const cfg = await ctx.db.dteConfig.findUnique({
    where: { tenantId: ctx.tenantId },
    select: { fechaCorte1_0: true },
  });
  const corridas = await ctx.db.ventasProgramacionCorrida.findMany({
    where: { programacionId: { in: progs.map((p) => p.id) } },
    select: { programacionId: true, periodo: true },
  });
  const h = hoy();
  const out: IngresoProyectadoDesdeDte[] = [];
  for (const p of progs) {
    const corte = {
      fechaCorte: dia(cfg?.fechaCorte1_0 ?? null),
      ultimoPeriodo10: p.ultimoPeriodo10,
    };
    const hechos = new Set(corridas.filter((c) => c.programacionId === p.id).map((c) => c.periodo));
    const lista = periodosProgramacion(agendaDe(p), corte, {
      desde: desdeRecuperacion(h),
      hasta,
      hechos,
      limite: 60,
    });
    for (const per of lista) {
      const c = await calcularPeriodo(ctx, p, per.periodo, per.fecha, ufEstimada, true);
      if (!c.ok) continue;
      out.push({
        documentoEmitidoId: null,
        programacionId: p.id,
        cuentaId: p.cuentaId!,
        instalacionId: p.instalacionId,
        semanaCobro: semanaDe(fechaCobro(per.fecha, vencimientoPago(per.fecha, p.plazoPagoDias), p.cuentaId!)),
        monto: c.calc.montos.total,
        etiqueta: `Programación · ${p.nombre} · ${per.periodo}`,
        capa: "comprometido",
      });
    }
  }
  return out;
}

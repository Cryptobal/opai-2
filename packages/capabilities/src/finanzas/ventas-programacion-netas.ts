// Ventas netas aún no emitidas por período, para estimar el % de ventas de los gastos recurrentes (CAR-374).
// Suma neto + exento (sin IVA) de los períodos programados sin generar y de los borradores. Solo lectura y sin N+1:
// una consulta por tabla, el cálculo de cada período va con la última UF (igual que la proyección del flujo).
import { fechaFacturaProyectada, periodosProgramacion } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { dia } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { hoyChile } from "./cobro-esperado-datos";
import { agendaDe, desdeRecuperacion } from "./ventas-programacion-agenda";
import { calcularPeriodo } from "./ventas-programacion-calculo";
import { ufCentavosUltima } from "./ventas-programacion-uf";

type Lector = Pick<
  TenantTx,
  "ventasProgramacion" | "ventasProgramacionCorrida" | "dteConfig" | "indicadorLegal" | "valorPublicado" | "documentoEmitido"
>;

const aIso = (d: Date) => d.toISOString().slice(0, 10);
const sumar = (m: Map<string, number>, periodo: string, v: number) => m.set(periodo, (m.get(periodo) ?? 0) + v);

/**
 * Neto + exento por período «aaaa-mm» hasta `hasta` (inclusive), de lo que todavía no es venta emitida. Cada período
 * va al mes en que se emitirá su factura (misma regla que el borrador); lo atrasado (un período sin generar o un
 * borrador con fecha pasada o sin fecha) va al mes en curso, en hora de Chile. Las notas de crédito en borrador restan.
 */
export async function ventasProgramadasPorPeriodo(ctx: Contexto, db: Lector, hasta: string): Promise<Map<string, number>> {
  const h = hoyChile();
  const actual = h.slice(0, 7);
  const out = new Map<string, number>();
  const borradores = await db.documentoEmitido.groupBy({
    by: ["fechaEmision", "tipoDte"],
    where: {
      estadoDte: "borrador",
      tipoDte: { in: [33, 34, 56, 61] },
      OR: [{ fechaEmision: null }, { fechaEmision: { lte: new Date(`${hasta}T00:00:00Z`) } }],
    },
    _sum: { montoNeto: true, montoExento: true },
  });
  for (const g of borradores) {
    const neto = (g._sum.montoNeto ?? 0) + (g._sum.montoExento ?? 0);
    const mes = g.fechaEmision ? aIso(g.fechaEmision).slice(0, 7) : actual;
    sumar(out, mes < actual ? actual : mes, g.tipoDte === 61 ? -neto : neto);
  }
  const progs = await db.ventasProgramacion.findMany({
    where: { activa: true },
    include: { lineas: { orderBy: { orden: "asc" } } },
    orderBy: { id: "asc" },
    take: 200,
  });
  if (!progs.length) return out;
  const ufEstimada = await ufCentavosUltima(db);
  const cfg = await db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId }, select: { fechaCorte1_0: true } });
  const corridas = await db.ventasProgramacionCorrida.findMany({
    where: { programacionId: { in: progs.map((p) => p.id) } },
    select: { programacionId: true, periodo: true },
  });
  for (const p of progs) {
    const hechos = new Set(corridas.filter((c) => c.programacionId === p.id).map((c) => c.periodo));
    const corte = { fechaCorte: dia(cfg?.fechaCorte1_0 ?? null), ultimoPeriodo10: p.ultimoPeriodo10 };
    const lista = periodosProgramacion(agendaDe(p), corte, { desde: desdeRecuperacion(h), hasta, hechos, limite: 60 });
    for (const per of lista) {
      // Sin consultas: con `soloEstimada` el cálculo usa la última UF y no lee la base.
      const c = await calcularPeriodo(ctx, p, per.periodo, per.fecha, ufEstimada, true);
      if (!c.ok) continue;
      const emision = fechaFacturaProyectada(per.fecha, {
        diasFacturacion: p.diasFacturacion,
        momento: p.facturaTiming,
        diaFijo: p.facturaDia,
        mesRelativo: p.facturaMesRelativo,
      }).fecha;
      if (emision > hasta) continue;
      sumar(out, emision < h ? actual : emision.slice(0, 7), c.calc.montos.neto + c.calc.montos.exento);
    }
  }
  return out;
}

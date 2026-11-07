// Genera el borrador de un período de una programación (BRIEF-26 · CAR-159). Una sola transacción:
// documento + corrida (UNIQUE programación + período) + evento. Nunca emite al SII.
import { marcadoresDeGlosa, renderGlosa, vencimientoPago } from "@opai/domain";

import { aFecha } from "../core/maestros/comun";
import { conflicto } from "../errores";
import type { Contexto } from "../types";
import {
  calcularPeriodo,
  omitido,
  type ProgramacionGenerable,
  type ResultadoPeriodo,
} from "./ventas-programacion-calculo";
import { ufCentavosDelDia } from "./ventas-programacion-uf";

export type { ProgramacionGenerable, ResultadoPeriodo };

/** Genera el borrador del período. Si otra ejecución ya lo hizo, devuelve «ya_generado». */
export async function generarPeriodo(
  ctx: Contexto,
  p: ProgramacionGenerable,
  periodo: string,
  fecha: string,
  dryRun: boolean,
): Promise<ResultadoPeriodo> {
  const previo = await ctx.db.ventasProgramacionCorrida.findFirst({
    where: { programacionId: p.id, periodo },
    select: { documentoId: true },
  });
  if (previo)
    return {
      ...omitido(periodo, fecha, "El período ya tiene borrador."),
      estado: "ya_generado",
      documentoId: previo.documentoId,
    };
  const c = await calcularPeriodo(ctx, p, periodo, fecha);
  if (!c.ok) return c.resultado;
  const base = {
    periodo,
    fecha,
    motivo: null,
    montoTotal: c.calc.montos.total,
    ufCentavos: c.uf === null ? null : Number(c.uf),
  };
  if (dryRun) return { ...base, estado: "generado", documentoId: null };
  try {
    // Marcadores en las glosas de las líneas. La UF del día de emisión solo se consulta si alguna la pide.
    const pideUfDia = c.calc.lineas.some((l) => marcadoresDeGlosa(l.glosa).includes("uf_al_dia"));
    const ufDia = pideUfDia ? await ufCentavosDelDia(ctx.db, fecha) : null;
    const glosaLinea = (g: string) =>
      renderGlosa(g, { periodo, ufCentavos: c.uf, ufDiaCentavos: ufDia, montoClp: c.calc.montos.total });
    const documentoId = await ctx.transaccion(async (tx) => {
      const m = c.calc.montos;
      const doc = await tx.documentoEmitido.create({
        data: {
          tenantId: ctx.tenantId,
          cuentaId: p.cuentaId!,
          instalacionId: p.instalacionId,
          tipoDte: p.tipoDte,
          fechaEmision: aFecha(fecha),
          fechaVencimiento: aFecha(vencimientoPago(fecha, p.plazoPagoDias)),
          montoNeto: m.neto,
          montoExento: m.exento,
          montoIva: m.iva,
          montoOtros: m.otros,
          montoTotal: m.total,
          glosa: `${p.nombre} · ${periodo}`,
          lineas: {
            create: c.calc.lineas.map((l, orden) => ({
              tenantId: ctx.tenantId,
              orden,
              glosa: glosaLinea(l.glosa),
              monto: l.monto,
            })),
          },
        },
        select: { id: true },
      });
      await tx.ventasProgramacionCorrida.create({
        data: {
          tenantId: ctx.tenantId,
          programacionId: p.id,
          periodo,
          documentoId: doc.id,
          fechaGeneracion: aFecha(fecha),
          ufCentavos: c.uf,
          montoTotal: BigInt(m.total),
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.venta.borrador_creado",
        entidadTipo: "documento_emitido",
        entidadId: doc.id,
        payload: { programacionId: p.id, periodo },
      });
      return doc.id;
    });
    return { ...base, estado: "generado", documentoId };
  } catch (e) {
    // Dos ejecuciones a la vez: el UNIQUE de la corrida decide y la transacción perdedora se revierte.
    if ((e as { code?: unknown } | null)?.code === "P2002")
      throw conflicto("El período ya tiene borrador.");
    throw e;
  }
}

// Pagos de IVA y PPM proyectados para el flujo de caja (ADR-073, regla 5). Solo lectura.
import {
  type DocumentoImpuesto,
  fechaDePago,
  impuestosPorPeriodo,
  lunesDe,
  type PagoImpuesto,
  pagosDeImpuestos,
  periodoDeFecha,
  sumarMeses,
} from "@opai/domain";

import type { Contexto } from "../types";
import { ajusteFinanzas } from "./ajuste-finanzas";
import { hoyChile } from "./cobro-esperado-datos";

/** Día del mes en que se paga el IVA si la empresa no configuró otro (el F29 vence el 20). */
export const DIA_PAGO_IVA_DEFECTO = 20;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export type PagoImpuestoEsperado = PagoImpuesto & { semana: string };

/**
 * IVA y PPM de los meses cuyo pago todavía cae desde la semana en curso. Un pago cuya semana ya pasó lo cuenta la
 * cartola (no se proyecta). El IVA y el PPM de un mes aún abierto crecen a medida que se emite y se recibe.
 */
export async function pagosImpuestosEsperados(ctx: Contexto, hoy: string = hoyChile()): Promise<PagoImpuestoEsperado[]> {
  const tasaPpmBps = await ajusteFinanzas(ctx, "flujo_tasa_ppm_bps");
  const lunesActual = lunesDe(hoy);
  const desde = fechaDePago(sumarMeses(periodoDeFecha(hoy), -2), 1); // el IVA de hace 2 meses, postergado, cae este mes
  const desdeFecha = new Date(`${desde}T00:00:00Z`);
  const [ajustes, ventas, compras, marcados] = await Promise.all([
    ctx.db.flujoAjustes.findFirst({ select: { calendarioPagos: true } }),
    ctx.db.documentoEmitido.findMany({
      where: { estadoDte: { in: ["enviado", "aceptado", "anulado_nc"] }, tipoDte: { in: [33, 34, 56, 61] }, fechaEmision: { gte: desdeFecha } },
      select: { fechaEmision: true, tipoDte: true, montoNeto: true, montoExento: true, montoIva: true },
    }),
    ctx.db.documentoRecibido.findMany({
      where: { estadoRecepcion: { not: "reclamado" }, tipoDte: { in: [33, 34, 56, 61] }, fechaRecepcion: { gte: desdeFecha } },
      select: { fechaRecepcion: true, tipoDte: true, montoNeto: true, montoExento: true, montoIva: true },
    }),
    ctx.db.flujoIvaPostergado.findMany({ select: { periodo: true } }),
  ]);
  const dia = Number((ajustes?.calendarioPagos as { iva?: number } | null)?.iva ?? DIA_PAGO_IVA_DEFECTO);
  const aDoc = (fecha: Date | null, d: { tipoDte: number; montoNeto: number; montoExento: number; montoIva: number }): DocumentoImpuesto[] =>
    fecha ? [{ fecha: iso(fecha), tipoDte: d.tipoDte, montoNeto: d.montoNeto, montoExento: d.montoExento, montoIva: d.montoIva }] : [];
  const impuestos = impuestosPorPeriodo({
    ventas: ventas.flatMap((d) => aDoc(d.fechaEmision, d)),
    compras: compras.flatMap((d) => aDoc(d.fechaRecepcion, d)),
    tasaPpmBps,
  });
  return pagosDeImpuestos(impuestos, dia, new Set(marcados.map((m) => m.periodo)))
    .map((p) => ({ ...p, semana: lunesDe(p.fecha) }))
    .filter((p) => p.semana >= lunesActual);
}

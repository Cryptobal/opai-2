// Remanente de crédito fiscal con que se llega a un mes (CAR-173): arrastra los meses anteriores dentro de una ventana
// acotada, con los mismos documentos y criterios del borrador del F29. Solo lectura.
import { impuestosPorPeriodo, remanenteAnterior, sumarMeses } from "@opai/domain";

import type { Contexto } from "../types";
import { aFecha } from "../core/maestros/comun";

/** Meses hacia atrás que se arrastran: el remanente más antiguo se habría consumido o el SII exigiría revisarlo. */
export const MESES_REMANENTE = 24;
const TIPOS = [33, 34, 56, 61];
const ESTADOS_VENTA = ["enviado", "aceptado", "anulado_nc"];
// El filtro por rango ya excluye fechas nulas; el respaldo solo satisface el tipo.
const iso = (d: Date | null) => (d ?? new Date(0)).toISOString().slice(0, 10);

export async function remanenteDelMes(ctx: Contexto, periodo: string): Promise<number> {
  const desde = aFecha(`${sumarMeses(periodo, -MESES_REMANENTE)}-01`);
  const hasta = aFecha(`${periodo}-01`);
  const sel = { tipoDte: true, montoNeto: true, montoExento: true, montoIva: true } as const;
  const [ventas, compras] = await Promise.all([
    ctx.db.documentoEmitido.findMany({
      where: { estadoDte: { in: ESTADOS_VENTA }, tipoDte: { in: TIPOS }, fechaEmision: { gte: desde, lt: hasta } },
      select: { ...sel, fechaEmision: true },
    }),
    ctx.db.documentoRecibido.findMany({
      where: { estadoRecepcion: { not: "reclamado" }, tipoDte: { in: TIPOS }, fechaRecepcion: { gte: desde, lt: hasta } },
      select: { ...sel, fechaRecepcion: true },
    }),
  ]);
  const meses = impuestosPorPeriodo({
    ventas: ventas.map(({ fechaEmision, ...f }) => ({ fecha: iso(fechaEmision), ...f })),
    compras: compras.map(({ fechaRecepcion, ...f }) => ({ fecha: iso(fechaRecepcion), ...f })),
    tasaPpmBps: 0,
  });
  return remanenteAnterior(meses, periodo);
}

import { UF_ESCALA } from "@opai/domain";

import { enScope } from "../../../autorizacion";
import { ufCentavosUltima } from "../../../finanzas/ventas-programacion-uf";
import type { Contexto } from "../../../types";
import { clpAUfEscalada } from "./fechas";

export type NegociosAbiertos = {
  cantidad: number;
  /** Suma mensual en CLP de lo abierto (valor de la cotización vigente o, si no hay, el estimado). */
  valorMensualClp: number;
  /** Lo mismo en UF escalada (`UF_ESCALA`); null si no hay UF publicada. */
  valorMensualUf: number | null;
};

export async function negociosAbiertos(ctx: Contexto): Promise<NegociosAbiertos | null> {
  if (!enScope(ctx, "comercial") || !ctx.modulosActivos.includes("comercial")) return null;
  if (!ctx.autorizar("comercial:negocios.read")) return null;
  const filas = await ctx.db.negocio.groupBy({
    by: ["valorMensual", "montoEstimadoMensual"],
    where: { estado: "abierto", archivadoEn: null },
    _count: { _all: true },
  });
  let cantidad = 0;
  let valorMensualClp = 0;
  for (const f of filas) {
    cantidad += f._count._all;
    valorMensualClp += (f.valorMensual ?? f.montoEstimadoMensual ?? 0) * f._count._all;
  }
  const uf = await ufCentavosUltima(ctx.db);
  return {
    cantidad,
    valorMensualClp,
    valorMensualUf: uf ? clpAUfEscalada(valorMensualClp, uf, UF_ESCALA) : null,
  };
}

/** Aprobaciones de margen de cotizaciones pendientes; null sin permiso o sin el módulo. */
export async function cotizacionesPorAprobar(ctx: Contexto): Promise<number | null> {
  if (!enScope(ctx, "cpq") || !ctx.modulosActivos.includes("cpq")) return null;
  if (!ctx.autorizar("cpq:aprobar")) return null;
  return ctx.db.cpqAprobacion.count({ where: { estado: "pendiente" } });
}

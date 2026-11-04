import { type DocumentoCobranza, diaEnZona, ESTADOS_DTE_COBRABLES, TIPOS_DTE_COBRABLES } from "@opai/domain";

import type { Contexto } from "../types";
import { ambitoHabil, zonaDe } from "../comercial/seguimiento-comun";
import { ajuste } from "../core/config/valores";

const fecha = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

export type DocCobrable = DocumentoCobranza & { id: string; cuentaId: string; folio: number | null };

/** Parámetros de cobranza del tenant: «hoy» en su zona, plazo por defecto y pasos activos. */
export async function parametrosCobranza(ctx: Contexto) {
  const [zona, plazo, p1, p2, p3, auto] = await Promise.all([
    zonaDe(ctx),
    ajuste<number>(ctx, "finanzas", "cobranza_plazo_cobro_dias"),
    ajuste<number>(ctx, "finanzas", "cobranza_paso_1_dias"),
    ajuste<number>(ctx, "finanzas", "cobranza_paso_2_dias"),
    ajuste<number>(ctx, "finanzas", "cobranza_paso_3_dias"),
    ajuste<boolean>(ctx, "finanzas", "cobranza_recordatorios_automaticos"),
  ]);
  const hoy = diaEnZona(new Date(), zona);
  const pasos = [p1, p2, p3].filter((n) => n > 0).sort((a, b) => a - b);
  return { hoy, plazoDefectoDias: plazo, pasos, automatico: auto, ambito: await ambitoHabil(ctx, new Date(`${hoy}T00:00:00Z`)) };
}

/** Documentos emitidos que pueden estar en cobranza (el dominio decide cuáles lo están de verdad). */
export async function documentosCobrables(ctx: Contexto, cuentaId?: string): Promise<DocCobrable[]> {
  const filas = await ctx.db.documentoEmitido.findMany({
    where: {
      tipoDte: { in: [...TIPOS_DTE_COBRABLES] },
      estadoDte: { in: [...ESTADOS_DTE_COBRABLES] },
      ...(cuentaId ? { cuentaId } : {}),
    },
    select: {
      id: true, cuentaId: true, folio: true, tipoDte: true, estadoDte: true, cesionEstado: true,
      montoTotal: true, montoCobrado: true, fechaVencimiento: true, fechaEmision: true, cobranzaPausada: true,
    },
    orderBy: [{ fechaVencimiento: "asc" }, { id: "asc" }],
  });
  return filas.map((f) => ({
    ...f,
    fechaVencimiento: fecha(f.fechaVencimiento),
    fechaEmision: fecha(f.fechaEmision),
  }));
}

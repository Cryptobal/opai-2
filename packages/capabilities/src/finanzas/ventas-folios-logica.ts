import {
  AVISO_CAF_DIAS_DEFECTO,
  UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO,
  cafPorVencer,
  cafVencido,
  foliosPorAgotarse,
  foliosRestantes,
  type TipoDteVenta,
  umbralFoliosDesdePct,
} from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { hoy } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { exigirCafDelAmbiente } from "./caf-ambiente";

export async function avisosDteDe(ctx: Pick<Contexto, "db" | "tenantId">) {
  const cfg = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
  return {
    umbralFoliosPct: cfg?.umbralFoliosPct ?? UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO,
    avisoCafDias: cfg?.avisoCafDias ?? AVISO_CAF_DIAS_DEFECTO,
  };
}

type TxLike = Pick<Contexto, "db" | "transaccion" | "tenantId">;

async function reservarFolioEnTx(
  tx: TenantTx,
  tenantId: string,
  tipoDte: TipoDteVenta,
  dryRun: boolean,
): Promise<number> {
  const hoyIso = hoy();
  const cfg = await tx.dteConfig.findUnique({ where: { tenantId } });
  const rangos = await tx.dteFolio.findMany({
    where: { tipoDte, activo: true },
    orderBy: [{ folioDesde: "asc" }, { id: "asc" }],
  });
  for (const rango of rangos) {
    if (rango.folioActual > rango.folioHasta) continue;
    const venceIso = rango.cafVenceEn?.toISOString().slice(0, 10) ?? null;
    if (cafVencido(venceIso, hoyIso)) continue;
    exigirCafDelAmbiente(cfg, rango);
    const folio = rango.folioActual;
    if (dryRun) return folio;
    const { count } = await tx.dteFolio.updateMany({
      where: { id: rango.id, folioActual: folio, activo: true },
      data: { folioActual: folio + 1 },
    });
    if (count !== 1) {
      throw reglaDeNegocio("No se pudo reservar el folio; reintente la emisión.");
    }
    return folio;
  }
  const hayActivos = rangos.some((r) => r.folioActual <= r.folioHasta);
  if (!hayActivos) {
    throw reglaDeNegocio(`No hay folios disponibles para el DTE ${tipoDte}. Cargue un CAF.`);
  }
  throw reglaDeNegocio("El CAF vigente está vencido; cargue un CAF nuevo antes de emitir.");
}

/** Reserva el siguiente folio del rango activo (optimista con updateMany). */
export async function consumirFolio(
  ctx: TxLike,
  tipoDte: TipoDteVenta,
  dryRun: boolean,
  tx?: TenantTx,
): Promise<number> {
  if (tx) return reservarFolioEnTx(tx, ctx.tenantId, tipoDte, dryRun);
  return ctx.transaccion((t) => reservarFolioEnTx(t, ctx.tenantId, tipoDte, dryRun));
}

/**
 * Los próximos `cantidad` folios que se asignarían, sin consumirlos (lectura corta fuera de la transacción de
 * la escritura). Sirven para firmar antes de abrirla: dentro, `consumirFolio` debe devolver los mismos; si otro
 * proceso se adelantó, la emisión pide reintentar y el XML firmado se descarta sin haber enviado nada al SII.
 */
export async function foliosPrevistos(ctx: TxLike, tipoDte: TipoDteVenta, cantidad: number): Promise<number[]> {
  const hoyIso = hoy();
  const [rangos, cfg] = await Promise.all([
    ctx.db.dteFolio.findMany({ where: { tipoDte, activo: true }, orderBy: [{ folioDesde: "asc" }, { id: "asc" }] }),
    ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } }),
  ]);
  const folios: number[] = [];
  for (const r of rangos) {
    if (cafVencido(r.cafVenceEn?.toISOString().slice(0, 10) ?? null, hoyIso)) continue;
    if (r.folioActual > r.folioHasta) continue;
    exigirCafDelAmbiente(cfg, r);
    for (let f = r.folioActual; f <= r.folioHasta && folios.length < cantidad; f++) folios.push(f);
    if (folios.length >= cantidad) break;
  }
  if (folios.length < cantidad) {
    throw reglaDeNegocio(`No hay folios disponibles para el DTE ${tipoDte}. Cargue un CAF.`);
  }
  return folios;
}

export type OpcionesFolioVista = {
  umbralFoliosPct: number;
  avisoCafDias: number;
  hoyIso?: string;
};

export function folioVista(
  r: {
    id: string;
    tipoDte: number;
    folioDesde: number;
    folioHasta: number;
    folioActual: number;
    cafVenceEn: Date | null;
    umbralAviso: number;
    activo: boolean;
  },
  opts?: OpcionesFolioVista,
) {
  const hoyIso = opts?.hoyIso ?? hoy();
  const pct = opts?.umbralFoliosPct ?? r.umbralAviso ?? UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO;
  const avisoCafDias = opts?.avisoCafDias ?? AVISO_CAF_DIAS_DEFECTO;
  const restantes = foliosRestantes(r.folioActual, r.folioHasta);
  const umbral = umbralFoliosDesdePct(r.folioDesde, r.folioHasta, pct);
  const venceIso = r.cafVenceEn?.toISOString().slice(0, 10) ?? null;
  const alertaFoliosBajos = foliosPorAgotarse(restantes, umbral);
  const alertaCafPorVencer = r.activo && cafPorVencer(venceIso, hoyIso, avisoCafDias);
  return {
    id: r.id,
    tipoDte: r.tipoDte,
    folioDesde: r.folioDesde,
    folioHasta: r.folioHasta,
    folioActual: r.folioActual,
    restantes,
    alertaFoliosBajos,
    alertaCafPorVencer,
    alerta: alertaFoliosBajos || alertaCafPorVencer,
    cafVenceEn: venceIso,
    activo: r.activo,
  };
}

/** Marca un borrador como emitido solo si sigue en borrador sin folio (C1). */
export async function marcarBorradorEmitido(
  tx: TenantTx,
  documentoId: string,
  data: { folio: number; fechaEmision: Date; timbrePdf417: string; xmlStorageKey?: string },
): Promise<void> {
  const { count } = await tx.documentoEmitido.updateMany({
    where: { id: documentoId, estadoDte: "borrador", folio: null },
    data: {
      folio: data.folio,
      fechaEmision: data.fechaEmision,
      estadoDte: "enviado",
      timbrePdf417: data.timbrePdf417,
      xmlStorageKey: data.xmlStorageKey ?? `dte/${documentoId}.xml`,
      cesionEstado: "no_cedido",
    },
  });
  if (count !== 1) {
    throw reglaDeNegocio("El documento ya no es un borrador emitible; otro proceso pudo emitirlo.");
  }
}

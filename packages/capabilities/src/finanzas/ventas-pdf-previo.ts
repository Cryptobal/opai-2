// PDF de la proforma y del estado de pago de un borrador generado por una programación (CAR-320, sobre CAR-221).
// No son documentos tributarios: llevan un número interno («PF-2026-12-0001»), no un folio del SII, y salen del borrador.
import { mesYAnio } from "@opai/domain";
import { generarPdfPrevio } from "@opai/integrations";

import { hoy } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { cuentaDe, rutEmisorDe } from "./ventas-comun";
import { cantidadTexto, emisorDePerfil, receptorPdf } from "./ventas-pdf-doc";
import type { TipoPrevio } from "./ventas-programacion-previos";

const PREFIJO: Record<TipoPrevio, string> = { proforma: "PF", estado_pago: "EP" };
const NOMBRE_ARCHIVO: Record<TipoPrevio, string> = { proforma: "Proforma", estado_pago: "Estado de pago" };
/** Referencias que el cliente reconoce, con su código del SII entre paréntesis. */
const REF: Record<number, string> = { 801: "OC", 802: "HES", 803: "Contrato", 804: "Resolución" };
const dia = (d: Date | null | undefined) => d?.toISOString().slice(0, 10);

/**
 * Número interno estable: prefijo, período y correlativo de la corrida dentro del período en la empresa. Las corridas no
 * se borran (un borrador descartado conserva su corrida), así que el número no cambia al reenviar.
 */
export async function numeroInterno(ctx: Contexto, tipo: TipoPrevio, documentoId: string): Promise<string> {
  const c = await ctx.db.ventasProgramacionCorrida.findFirst({
    where: { documentoId },
    select: { id: true, periodo: true, createdAt: true },
  });
  if (!c) return `${PREFIJO[tipo]}-${documentoId.slice(-8).toUpperCase()}`;
  const n = await ctx.db.ventasProgramacionCorrida.count({
    where: { periodo: c.periodo, OR: [{ createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lte: c.id } }] },
  });
  return `${PREFIJO[tipo]}-${c.periodo}-${String(n).padStart(4, "0")}`;
}

/** Arma el PDF y el nombre del archivo adjunto. `fechaFactura` es el período que cubre (aaaa-mm-dd). */
export async function pdfDePrevio(
  ctx: Contexto,
  tipo: TipoPrevio,
  b: { documentoId: string; cuentaId: string; fechaFactura: string },
): Promise<{ numero: string; nombre: string; bytes: Uint8Array }> {
  const [numero, doc, cuenta, rutEmisor, tenant, perfil, lineas, referencias] = await Promise.all([
    numeroInterno(ctx, tipo, b.documentoId),
    ctx.db.documentoEmitido.findFirst({
      where: { id: b.documentoId },
      select: { montoNeto: true, montoExento: true, montoIva: true, montoTotal: true, fechaVencimiento: true },
    }),
    cuentaDe(ctx, b.cuentaId),
    rutEmisorDe(ctx),
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
    ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } }),
    ctx.db.documentoEmitidoLinea.findMany({ where: { documentoId: b.documentoId }, orderBy: { orden: "asc" } }),
    ctx.db.documentoEmitidoReferencia.findMany({ where: { documentoId: b.documentoId }, orderBy: { id: "asc" } }),
  ]);
  if (!doc) throw new Error("BORRADOR_NO_ENCONTRADO");
  const { mes, anio } = mesYAnio(b.fechaFactura);
  const vence = dia(doc.fechaVencimiento);
  const bytes = await generarPdfPrevio({
    tipo,
    numeroInterno: numero,
    version: 1,
    fechaEmision: hoy(),
    ...(vence ? { fechaVencimiento: vence } : {}),
    periodo: `${mes} ${anio}`,
    emisor: emisorDePerfil(perfil, tenant?.nombre, rutEmisor),
    receptor: receptorPdf(cuenta),
    lineas: lineas.map((l) => ({
      descripcion: l.glosa,
      monto: l.monto,
      ...(l.cantidad ? { cantidad: [cantidadTexto(l.cantidad.toString()), l.unidad?.trim()].filter(Boolean).join(" ") } : {}),
      ...(l.precioUnitario !== null ? { precio: l.precioUnitario } : {}),
      ...(l.descuentoPct ? { descuentoPct: l.descuentoPct } : {}),
    })),
    neto: doc.montoNeto,
    exento: doc.montoExento,
    iva: doc.montoIva,
    total: doc.montoTotal,
    referencias: referencias.map((r) => `${REF[r.tipoDteRef] ?? "Ref."} ${r.folioRef} (${r.tipoDteRef})`),
  });
  return { numero, nombre: `${NOMBRE_ARCHIVO[tipo]} ${numero}.pdf`, bytes };
}

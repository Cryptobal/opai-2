import { generarPdfDte } from "@opai/integrations";

import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { cuentaDe, receptorDteDe, rutEmisorDe } from "./ventas-comun";

type DocPdf = {
  id: string;
  tipoDte: number;
  folio: number | null;
  timbrePdf417: string | null;
  fechaEmision: Date | null;
  cuentaId: string;
  montoNeto: number;
  montoExento: number;
  montoIva: number;
  montoTotal: number;
  glosa: string | null;
};

const dia = (d: Date | null | undefined) => d?.toISOString().slice(0, 10) ?? "";

/** Representación impresa (PDF) de un documento emitido y firmado; la usan la ficha y el envío al cliente. */
export async function pdfDeDocumento(ctx: Contexto, doc: DocPdf): Promise<Uint8Array> {
  if (doc.folio == null || !doc.timbrePdf417) {
    throw reglaDeNegocio("Solo hay PDF para documentos emitidos y firmados.");
  }
  const [cuenta, rutEmisor, tenant, lineas, referencias, cfg] = await Promise.all([
    cuentaDe(ctx, doc.cuentaId),
    rutEmisorDe(ctx),
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
    ctx.db.documentoEmitidoLinea.findMany({ where: { documentoId: doc.id }, orderBy: { orden: "asc" } }),
    ctx.db.documentoEmitidoReferencia.findMany({ where: { documentoId: doc.id }, orderBy: { id: "asc" } }),
    ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } }),
  ]);
  const r = receptorDteDe(cuenta);
  return generarPdfDte({
    tipoDte: doc.tipoDte,
    folio: doc.folio,
    fechaEmision: dia(doc.fechaEmision),
    emisor: { razon: tenant?.nombre ?? "Emisor", rut: rutEmisor },
    receptor: {
      razon: r.razonSocialReceptor,
      rut: cuenta.rut ?? "66000000-0",
      ...(r.giroReceptor ? { giro: r.giroReceptor } : {}),
      ...(r.direccionReceptor ? { direccion: r.direccionReceptor } : {}),
      ...(r.comunaReceptor ? { comuna: r.comunaReceptor } : {}),
      ...(r.ciudadReceptor ? { ciudad: r.ciudadReceptor } : {}),
    },
    lineas: lineas.map((l) => ({ descripcion: l.glosa, monto: l.monto })),
    referencias: referencias.map((x) => ({
      tipoDteRef: x.tipoDteRef,
      folioRef: x.folioRef,
      codigoRef: x.codigoRef,
      ...(x.fechaRef ? { fechaRef: dia(x.fechaRef) } : {}),
      ...(x.razonRef ? { razonRef: x.razonRef } : {}),
    })),
    neto: doc.montoNeto,
    exento: doc.montoExento,
    iva: doc.montoIva,
    total: doc.montoTotal,
    timbrePdf417: doc.timbrePdf417,
    ...(doc.glosa ? { glosa: doc.glosa } : {}),
    ...(cfg?.resolucionSiiNumero != null && cfg.resolucionSiiFecha
      ? { resolucion: { numero: cfg.resolucionSiiNumero, fecha: dia(cfg.resolucionSiiFecha) } }
      : {}),
  });
}

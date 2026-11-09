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

type Perfil = {
  razonSocial: string | null;
  giro: string | null;
  calle: string | null;
  comuna: string | null;
  ciudad?: string | null;
  telefono: string | null;
} | null;

/** Datos del emisor desde el perfil de la empresa (ADR-028); lo que no esté cargado no se inventa ni se imprime. */
export function emisorDePerfil(perfil: Perfil, nombreTenant: string | undefined, rut: string) {
  const limpio = (v: string | null | undefined) => v?.trim() || undefined;
  const giro = limpio(perfil?.giro);
  const direccion = limpio(perfil?.calle);
  const comuna = limpio(perfil?.comuna);
  const ciudad = limpio(perfil?.ciudad);
  const fono = limpio(perfil?.telefono);
  return {
    razon: limpio(perfil?.razonSocial) ?? nombreTenant ?? "Emisor",
    rut,
    ...(giro ? { giro } : {}),
    ...(direccion ? { direccion } : {}),
    ...(comuna ? { comuna } : {}),
    ...(ciudad ? { ciudad } : {}),
    ...(fono ? { fono } : {}),
  };
}

/** «2.0000» → «2», «0.5000» → «0.5», «10» → «10». */
export const cantidadTexto = (t: string) => (t.includes(".") ? t.replace(/\.?0+$/, "") : t);

const dia = (d: Date | null | undefined) => d?.toISOString().slice(0, 10) ?? "";

/** Representación impresa (PDF) de un documento emitido y firmado; la usan la ficha y el envío al cliente. */
export async function pdfDeDocumento(
  ctx: Contexto,
  doc: DocPdf,
  opciones: { borrador?: boolean } = {},
): Promise<Uint8Array> {
  const borrador = opciones.borrador === true;
  if (!borrador && (doc.folio == null || !doc.timbrePdf417)) {
    throw reglaDeNegocio("Solo hay PDF para documentos emitidos y firmados.");
  }
  const [cuenta, rutEmisor, tenant, perfil, lineas, referencias, cfg] = await Promise.all([
    cuentaDe(ctx, doc.cuentaId),
    rutEmisorDe(ctx),
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
    ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } }),
    ctx.db.documentoEmitidoLinea.findMany({ where: { documentoId: doc.id }, orderBy: { orden: "asc" } }),
    ctx.db.documentoEmitidoReferencia.findMany({ where: { documentoId: doc.id }, orderBy: { id: "asc" } }),
    ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } }),
  ]);
  const r = receptorDteDe(cuenta);
  return generarPdfDte({
    tipoDte: doc.tipoDte,
    folio: borrador ? null : doc.folio,
    fechaEmision: dia(doc.fechaEmision),
    emisor: emisorDePerfil(perfil, tenant?.nombre, rutEmisor),
    receptor: {
      razon: r.razonSocialReceptor,
      rut: cuenta.rut ?? "66000000-0",
      ...(r.giroReceptor ? { giro: r.giroReceptor } : {}),
      ...(r.direccionReceptor ? { direccion: r.direccionReceptor } : {}),
      ...(r.comunaReceptor ? { comuna: r.comunaReceptor } : {}),
      ...(r.ciudadReceptor ? { ciudad: r.ciudadReceptor } : {}),
    },
    lineas: lineas.map((l) => ({
      descripcion: l.glosa,
      monto: l.monto,
      // Solo lo que el documento guardó: los emitidos antes de CAR-221 no traen cantidad ni precio y no se inventan.
      ...(l.cantidad ? { cantidad: cantidadTexto(l.cantidad.toString()) } : {}),
      ...(l.precioUnitario !== null ? { precio: l.precioUnitario } : {}),
      ...(l.descuentoPct ? { descuentoPct: l.descuentoPct } : {}),
    })),
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
    timbrePdf417: borrador ? null : doc.timbrePdf417,
    ...(borrador ? { borrador: true } : {}),
    ...(doc.glosa ? { glosa: doc.glosa } : {}),
    ...(cfg?.oficinaSii ? { oficinaSii: cfg.oficinaSii } : {}),
    ...(cfg?.resolucionSiiNumero != null && cfg.resolucionSiiFecha
      ? { resolucion: { numero: cfg.resolucionSiiNumero, fecha: dia(cfg.resolucionSiiFecha) } }
      : {}),
  });
}

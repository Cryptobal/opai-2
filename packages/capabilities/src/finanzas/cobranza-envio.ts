import { diasVencido, estaVencida, saldoPendiente, vencimientoEfectivo } from "@opai/domain";

import { enviarCorreo } from "../core/comunicaciones";
import { escribirConEvento } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { correoDe } from "../integraciones/adaptadores";
import type { Contexto } from "../types";
import { documentosCobrables, parametrosCobranza } from "./cobranza-datos";
import { cuentaDe } from "./ventas-comun";
import { pdfDeDocumento } from "./ventas-pdf-doc";

const clp = (n: number) => `$${new Intl.NumberFormat("es-CL").format(n)}`;
const dmy = (iso: string) => iso.split("-").reverse().join("-");

export type ResultadoRecordatorio = {
  documentoId: string;
  estado: "enviado" | "fallido" | "omitido" | "vista_previa";
  para: string | null;
  cc: string[];
};

export const autorDe = (ctx: Contexto) =>
  ctx.actor.tipo === "user" ? ctx.actor.id : ctx.actor.tipo === "agent" ? ctx.actor.viaUserId : null;

/**
 * Envía el recordatorio de cobro de un documento vencido y deja la gestión en su historial.
 * Es lo único que manda correos de cobranza: lo usan la capacidad manual y el trabajo diario.
 * `paso` identifica el escalón de la secuencia automática (el índice único impide repetirlo).
 */
export async function enviarRecordatorio(
  ctx: Contexto,
  opts: { documentoId: string; origen: "manual" | "automatico"; paso?: number; dryRun?: boolean },
): Promise<ResultadoRecordatorio> {
  const p = await parametrosCobranza(ctx);
  const doc = (await documentosCobrables(ctx)).find((d) => d.id === opts.documentoId);
  if (!doc) throw noEncontrado("El documento");
  if (!estaVencida(doc, p.hoy, p.plazoDefectoDias)) {
    throw reglaDeNegocio("El documento no está vencido o ya no tiene saldo: no hay nada que recordar.");
  }
  const contactos = await ctx.db.contacto.findMany({
    where: {
      cuentaId: doc.cuentaId, estado: "activo", archivadoEn: null, anonimizadoEn: null,
      email: { not: null }, roles: { has: "facturacion" },
    },
    orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
  });
  const correos = [...new Set(contactos.map((c) => (c.email ?? "").trim().toLowerCase()).filter(Boolean))];
  const [para, ...cc] = correos;
  const registrar = (resultado: "enviado" | "fallido" | "omitido", detalle: string | null) =>
    escribirConEvento(
      ctx,
      { tipo: "finanzas.cobranza.recordatorio", entidadTipo: "documento_emitido", payload: () => ({ resultado, origen: opts.origen }) },
      (tx) =>
        tx.cobranzaGestion.create({
          data: {
            tenantId: ctx.tenantId, documentoId: doc.id, cuentaId: doc.cuentaId, canal: "correo",
            origen: opts.origen, paso: opts.paso ?? null, resultado, detalle, creadoPor: autorDe(ctx),
          },
        }),
    );
  if (!para) {
    if (opts.dryRun) return { documentoId: doc.id, estado: "omitido", para: null, cc: [] };
    if (opts.origen === "manual") {
      throw reglaDeNegocio("El cliente no tiene contactos con rol facturación y correo. Agrégalos en la ficha del cliente.");
    }
    await registrar("omitido", "Sin contactos de facturación con correo.");
    return { documentoId: doc.id, estado: "omitido", para: null, cc: [] };
  }
  if (opts.dryRun) return { documentoId: doc.id, estado: "vista_previa", para, cc };
  const emitido = await ctx.db.documentoEmitido.findFirst({ where: { id: doc.id } });
  if (!emitido) throw noEncontrado("El documento");
  const [cuenta, tenant, pdf] = await Promise.all([
    cuentaDe(ctx, doc.cuentaId),
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
    pdfDeDocumento(ctx, emitido),
  ]);
  const venc = vencimientoEfectivo(doc, p.plazoDefectoDias) as string;
  const salio = await enviarCorreo(
    { db: ctx.db, tenantId: ctx.tenantId, correo: await correoDe(ctx), urlBase: ctx.servicios.urlBase },
    "finanzas.cobranza.recordatorio",
    para,
    {
      cliente: { nombre: cuenta.nombre },
      documento: {
        tipo: doc.tipoDte === 34 ? "Factura exenta electrónica" : "Factura electrónica",
        folio: doc.folio,
        saldo: clp(saldoPendiente(doc)),
        vencimiento: dmy(venc),
        dias_vencido: diasVencido(venc, p.hoy),
      },
      empresa: { nombre: tenant?.nombre ?? "" },
    },
    { cc, adjuntos: [{ nombre: `factura-${doc.folio}.pdf`, contenidoBase64: Buffer.from(pdf).toString("base64"), mime: "application/pdf" }] },
  );
  await registrar(salio ? "enviado" : "fallido", salio ? null : "El correo no salió. Revisa Configuración → Comunicaciones.");
  return { documentoId: doc.id, estado: salio ? "enviado" : "fallido", para, cc };
}

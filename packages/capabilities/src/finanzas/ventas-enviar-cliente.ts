import { z } from "zod";

import { NOMBRE_TIPO_DTE_VENTA, agruparDestinatarios, type DestinatarioDoc, type TipoDteVenta } from "@opai/domain";

import { defineCapability } from "../define";
import { describirDocumento } from "./ventas-aprobacion-texto";
import type { Contexto } from "../types";
import { enviarCorreo } from "../core/comunicaciones";
import { escribirConEvento } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { correoDe } from "../integraciones/adaptadores";
import { adaptadorSiiDe } from "./adaptador-sii";
import { PERMISO_VENTAS, cuentaDe, documentoEmitidoIdSchema } from "./ventas-comun";
import { pdfDeDocumento } from "./ventas-pdf-doc";
import { xmlParaEnvioSii } from "./ventas-xml";

const clp = (n: number) => `$${new Intl.NumberFormat("es-CL").format(n)}`;
const dmy = (d: Date | null) =>
  d ? `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}` : "—";

type Destinos = { para: string; cc: string[]; bcc: string[] };

/**
 * Destinatarios del envío: los guardados en el documento (PARA, CC y BCC) o, si no hay lista, los contactos
 * de facturación activos del cliente (el principal primero como destinatario y los demás en copia).
 */
async function destinatariosDeEnvio(ctx: Contexto, doc: { id: string; cuentaId: string }): Promise<Destinos> {
  const guardados = await ctx.db.documentoEmitidoDestinatario.findMany({
    where: { documentoId: doc.id },
    orderBy: { orden: "asc" },
  });
  if (guardados.length > 0) {
    return agruparDestinatarios(
      guardados.map((g): DestinatarioDoc => ({
        tipo: g.tipo as DestinatarioDoc["tipo"],
        email: g.email,
        origen: g.origen as DestinatarioDoc["origen"],
      })),
    );
  }
  const contactos = await ctx.db.contacto.findMany({
    where: {
      cuentaId: doc.cuentaId,
      estado: "activo",
      archivadoEn: null,
      anonimizadoEn: null,
      email: { not: null },
      roles: { has: "facturacion" },
    },
    orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
  });
  const correos = [...new Set(contactos.map((c) => (c.email ?? "").trim().toLowerCase()).filter(Boolean))];
  const [para, ...cc] = correos;
  if (!para) {
    throw reglaDeNegocio(
      "El cliente no tiene contactos con rol facturación y correo. Agrégalos en la ficha del cliente o guarda los destinatarios del documento.",
    );
  }
  return { para, cc, bcc: [] };
}

const salidaSchema = z.object({
  documentoId: z.string(),
  para: z.string().describe("Destinatario principal: el PARA guardado en el documento o, sin lista guardada, el primer contacto de facturación."),
  cc: z.array(z.string()).describe("Destinatarios en copia."),
  bcc: z.array(z.string()).describe("Destinatarios en copia oculta (solo si se guardaron en el documento)."),
  adjuntos: z.array(z.enum(["pdf", "xml"])),
  estado: z.enum(["enviado", "fallido", "vista_previa"]),
});

export const ventasEnviarCliente = defineCapability({
  id: "finanzas.ventas.enviar_cliente",
  descripcion:
    "Envía por correo el PDF y el XML de un documento emitido a los destinatarios guardados en el documento (PARA, CC y BCC) o, si no hay lista guardada, a los contactos del cliente con rol facturación (el primero como destinatario, los demás en copia), con la plantilla de Comunicaciones. Deja el registro del envío en la ficha. Si ya se envió, pide confirmar el reenvío.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    documentoId: documentoEmitidoIdSchema,
    reenviar: z.boolean().default(false).describe("Confirma volver a enviar un documento ya enviado."),
  }),
  output: salidaSchema,
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  describirAprobacion: describirDocumento((d) => `enviar por correo al cliente la ${d}`),
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoId } });
    if (!doc) throw noEncontrado("El documento");
    if (doc.folio == null || !doc.timbrePdf417 || !["enviado", "aceptado"].includes(doc.estadoDte)) {
      throw reglaDeNegocio("Solo se envía al cliente un documento emitido y firmado.");
    }
    const { para, cc, bcc } = await destinatariosDeEnvio(ctx, doc);
    const correos = [para, ...cc, ...bcc];
    const previo = await ctx.db.documentoEmitidoEnvio.findFirst({
      where: { documentoId: doc.id, estado: "enviado" },
      orderBy: { createdAt: "desc" },
    });
    if (previo && !input.reenviar) {
      throw reglaDeNegocio(`Este documento ya se envió el ${dmy(previo.createdAt)}. Confirma el reenvío para volver a mandarlo.`);
    }
    // Con el SII simulado el XML es un marcador de pruebas: no se le manda al cliente.
    const adaptador = await adaptadorSiiDe(ctx);
    const conXml = adaptador.nombre !== "simulado";
    const adjuntos: ("pdf" | "xml")[] = conXml ? ["pdf", "xml"] : ["pdf"];
    if (dryRun) return { documentoId: doc.id, para, cc, bcc, adjuntos, estado: "vista_previa" as const };

    const xml = conXml ? await xmlParaEnvioSii(ctx, doc, adaptador) : null;
    const pdf = await pdfDeDocumento(ctx, doc);
    const cuenta = await cuentaDe(ctx, doc.cuentaId);
    const tenant = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } });
    const etiqueta = `${doc.tipoDte === 61 ? "nota-credito" : "factura"}-${doc.folio}`;
    const salio = await enviarCorreo(
      { db: ctx.db, tenantId: ctx.tenantId, correo: await correoDe(ctx), urlBase: ctx.servicios.urlBase },
      "finanzas.venta.enviada_cliente",
      para,
      {
        cliente: { nombre: cuenta.nombre },
        documento: {
          tipo: NOMBRE_TIPO_DTE_VENTA[doc.tipoDte as TipoDteVenta] ?? "Documento tributario electrónico",
          folio: doc.folio,
          total: clp(doc.montoTotal),
          vencimiento: dmy(doc.fechaVencimiento),
        },
        empresa: { nombre: tenant?.nombre ?? "" },
      },
      {
        cc,
        bcc,
        adjuntos: [
          { nombre: `${etiqueta}.pdf`, contenidoBase64: Buffer.from(pdf).toString("base64"), mime: "application/pdf" },
          ...(xml
            ? [{ nombre: `${etiqueta}.xml`, contenidoBase64: Buffer.from(xml, "utf8").toString("base64"), mime: "application/xml" }]
            : []),
        ],
      },
    );
    const estado = salio ? ("enviado" as const) : ("fallido" as const);
    await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.venta.enviada_cliente",
        entidadTipo: "documento_emitido",
        payload: () => ({ estado, destinatarios: correos.length }),
      },
      (tx) =>
        tx.documentoEmitidoEnvio.create({
          data: {
            tenantId: ctx.tenantId,
            documentoId: doc.id,
            destinatarios: correos,
            adjuntos: [...adjuntos],
            estado,
            error: salio ? null : "El correo no salió. Revisa Configuración → Comunicaciones.",
            enviadoPor: ctx.actor.tipo === "user" ? ctx.actor.id : ctx.actor.tipo === "agent" ? ctx.actor.viaUserId : null,
          },
        }),
    );
    return { documentoId: doc.id, para, cc, bcc, adjuntos: [...adjuntos], estado };
  },
});

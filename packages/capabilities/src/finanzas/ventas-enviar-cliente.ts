import { z } from "zod";

import { NOMBRE_TIPO_DTE_VENTA, type TipoDteVenta } from "@opai/domain";

import { defineCapability } from "../define";
import { describirDocumento } from "./ventas-aprobacion-texto";
import { enviarCorreo } from "../core/comunicaciones";
import { escribirConEvento } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { correoDe } from "../integraciones/adaptadores";
import { adaptadorSiiDe } from "./adaptador-sii";
import { PERMISO_VENTAS, cuentaDe, documentoEmitidoIdSchema } from "./ventas-comun";
import { correosDe, destinosDeDocumento } from "./ventas-destinos";
import { pdfDeDocumento } from "./ventas-pdf-doc";
import { xmlParaEnvioSii } from "./ventas-xml";

const clp = (n: number) => `$${new Intl.NumberFormat("es-CL").format(n)}`;
const dmy = (d: Date | null) =>
  d ? `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}` : "—";

const salidaSchema = z.object({
  documentoId: z.string(),
  para: z.string().describe("Primer destinatario principal (PARA)."),
  paraAdicionales: z.array(z.string()).describe("Los demás destinatarios principales: reciben igual que el primero."),
  cc: z.array(z.string()).describe("Destinatarios en copia; incluye siempre la casilla DTE del cliente."),
  bcc: z.array(z.string()).describe("Destinatarios en copia oculta (solo si se guardaron en el documento)."),
  adjuntos: z.array(z.enum(["pdf", "xml"])),
  estado: z.enum(["enviado", "fallido", "vista_previa"]),
});

export const ventasEnviarCliente = defineCapability({
  id: "finanzas.ventas.enviar_cliente",
  descripcion:
    "Envía por correo el PDF y el XML de un documento emitido a los destinatarios guardados en el documento (PARA, CC y BCC) o, si no hay lista guardada, a todos los contactos del cliente con rol facturación como destinatarios principales; la casilla DTE del cliente va siempre en copia. Usa la plantilla de Comunicaciones. Deja el registro del envío en la ficha. Si ya se envió, pide confirmar el reenvío.",
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
    const cuenta = await cuentaDe(ctx, doc.cuentaId);
    const destinos = await destinosDeDocumento(ctx, doc, cuenta.emailDte);
    if (!destinos) {
      throw reglaDeNegocio(
        "El cliente no tiene contactos con rol facturación ni casilla DTE. Agrégalos en la ficha del cliente o guarda los destinatarios del documento.",
      );
    }
    const { para, paraAdicionales, cc, bcc } = destinos;
    const correos = correosDe(destinos);
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
    if (dryRun) return { documentoId: doc.id, para, paraAdicionales, cc, bcc, adjuntos, estado: "vista_previa" as const };

    const xml = conXml ? await xmlParaEnvioSii(ctx, doc, adaptador) : null;
    const pdf = await pdfDeDocumento(ctx, doc);
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
        paraAdicionales,
        cc,
        bcc,
        // CAR-233: queda en el historial de correos de la cuenta, con reply-to a la dirección de registro.
        historial: { origen: "factura", cuentaId: doc.cuentaId },
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
    return { documentoId: doc.id, para, paraAdicionales, cc, bcc, adjuntos: [...adjuntos], estado };
  },
});

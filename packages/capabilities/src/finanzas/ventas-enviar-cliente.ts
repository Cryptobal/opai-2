import { z } from "zod";

import { defineCapability } from "../define";
import { enviarCorreo } from "../core/comunicaciones";
import { escribirConEvento } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { correoDe } from "../integraciones/adaptadores";
import { PERMISO_VENTAS, cuentaDe, documentoEmitidoIdSchema } from "./ventas-comun";
import { pdfDeDocumento } from "./ventas-pdf-doc";
import { leerXmlFirmadoDte } from "./ventas-xml";

const TIPOS: Record<number, string> = {
  33: "Factura electrónica",
  34: "Factura exenta electrónica",
  56: "Nota de débito electrónica",
  61: "Nota de crédito electrónica",
};
const clp = (n: number) => `$${new Intl.NumberFormat("es-CL").format(n)}`;
const dmy = (d: Date | null) =>
  d ? `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}` : "—";

const salidaSchema = z.object({
  documentoId: z.string(),
  para: z.string().describe("Primer contacto de facturación: destinatario del correo."),
  cc: z.array(z.string()).describe("Demás contactos de facturación, en copia."),
  adjuntos: z.array(z.enum(["pdf", "xml"])),
  estado: z.enum(["enviado", "fallido", "vista_previa"]),
});

export const ventasEnviarCliente = defineCapability({
  id: "finanzas.ventas.enviar_cliente",
  descripcion:
    "Envía por correo el PDF y el XML de un documento emitido a los contactos del cliente con rol facturación (el primero como destinatario, los demás en copia), con la plantilla de Comunicaciones. Deja el registro del envío en la ficha. Si ya se envió, pide confirmar el reenvío.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    documentoId: documentoEmitidoIdSchema,
    reenviar: z.boolean().default(false).describe("Confirma volver a enviar un documento ya enviado."),
  }),
  output: salidaSchema,
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoId } });
    if (!doc) throw noEncontrado("El documento");
    if (doc.folio == null || !doc.timbrePdf417 || !["enviado", "aceptado"].includes(doc.estadoDte)) {
      throw reglaDeNegocio("Solo se envía al cliente un documento emitido y firmado.");
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
        "El cliente no tiene contactos con rol facturación y correo. Agrégalos en la ficha del cliente.",
      );
    }
    const previo = await ctx.db.documentoEmitidoEnvio.findFirst({
      where: { documentoId: doc.id, estado: "enviado" },
      orderBy: { createdAt: "desc" },
    });
    if (previo && !input.reenviar) {
      throw reglaDeNegocio(`Este documento ya se envió el ${dmy(previo.createdAt)}. Confirma el reenvío para volver a mandarlo.`);
    }
    const adjuntos = ["pdf", "xml"] as const;
    if (dryRun) return { documentoId: doc.id, para, cc, adjuntos: [...adjuntos], estado: "vista_previa" as const };

    const xml = await leerXmlFirmadoDte(ctx, doc.xmlStorageKey);
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
          tipo: TIPOS[doc.tipoDte] ?? "Documento tributario electrónico",
          folio: doc.folio,
          total: clp(doc.montoTotal),
          vencimiento: dmy(doc.fechaVencimiento),
        },
        empresa: { nombre: tenant?.nombre ?? "" },
      },
      {
        cc,
        adjuntos: [
          { nombre: `${etiqueta}.pdf`, contenidoBase64: Buffer.from(pdf).toString("base64"), mime: "application/pdf" },
          { nombre: `${etiqueta}.xml`, contenidoBase64: Buffer.from(xml, "utf8").toString("base64"), mime: "application/xml" },
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
    return { documentoId: doc.id, para, cc, adjuntos: [...adjuntos], estado };
  },
});

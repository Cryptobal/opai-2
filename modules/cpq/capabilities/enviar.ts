import { z } from "zod";

import { defineCapability, enviarCorreo, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { pdfCotizacionConMarca } from "../persistencia/pdf-cotizacion";
import { cargarFilasVersion, proyectarCalculo, recalcularVersion } from "../persistencia/recalcular";
import { exigirBorrador } from "../persistencia/version";
import { manifestEnviarSchema, previewCorreoEnviarSchema } from "./enviar-esquemas";
import { uuidSchema } from "./esquemas";
import { PERMISO_MANAGE } from "./permisos";
import { cotizacionDe } from "./util";

export const cotizacionesEnviar = defineCapability({
  id: "cpq.cotizaciones.enviar",
  descripcion:
    "Congela la versión editable, guarda el cálculo, actualiza el valor mensual del negocio y opcionalmente envía correo al contacto.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    id: uuidSchema,
    contactoId: uuidSchema.optional(),
    mensaje: z.string().trim().max(2000).optional(),
  }),
  output: z.object({
    versionId: uuidSchema,
    estado: z.literal("enviada"),
    manifest: manifestEnviarSchema,
    correo: previewCorreoEnviarSchema.nullable(),
  }),
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, input, { dryRun }) {
    const c = await cotizacionDe(ctx, input.id);
    const pack = await cargarFilasVersion(ctx, input.id, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    const { version, secciones, lineas } = pack;
    exigirBorrador(version);
    const neg = await ctx.db.negocio.findFirst({
      where: { id: c.negocioId },
      select: { titulo: true, valorMensual: true },
    });
    const resultado = await recalcularVersion(ctx, input.id, undefined, false);
    if (!resultado) throw noEncontrado("La versión");
    if (resultado.noEnviable)
      throw reglaDeNegocio("La cotización no se puede enviar: revisa advertencias y costos pendientes.");
    const calculoPublico = proyectarCalculo(ctx, resultado);
    const seccionesVista = secciones.map((s) => ({
      nombre: s.nombre,
      lineas: lineas
        .filter((l) => l.seccionId === s.id)
        .map((l) => ({ nombre: l.nombre, tipo: l.tipo })),
    }));
    const pdfPack = await pdfCotizacionConMarca(ctx, {
      codigo: c.codigo,
      titulo: c.titulo,
      negocio: neg?.titulo ?? "Negocio",
      secciones: seccionesVista,
      calculo: {
        ventaMensual: calculoPublico.ventaMensual ?? null,
        fecha: calculoPublico.fecha ?? "",
        pagosUnicos: "pagosUnicos" in calculoPublico ? calculoPublico.pagosUnicos : 0,
      },
    });
    const pdf = pdfPack.bytes;
    let para: string | null = null;
    if (input.contactoId) {
      const contacto = await ctx.db.contacto.findFirst({
        where: { id: input.contactoId },
        select: { email: true },
      });
      if (!contacto) throw noEncontrado("El contacto");
      para = contacto.email;
    }
    const correoPreview = {
      evento: "cpq.cotizacion.enviada" as const,
      para,
      asunto: `Propuesta ${c.codigo}`,
      datos: {
        codigo: c.codigo,
        titulo: c.titulo,
        negocio: neg?.titulo ?? "",
        ventaMensual: calculoPublico.ventaMensual,
        mensaje: input.mensaje ?? "",
      },
    };
    const manifest = {
      codigo: c.codigo,
      titulo: c.titulo,
      negocioTitulo: neg?.titulo ?? null,
      secciones: seccionesVista,
      calculo: calculoPublico,
      pdfBytes: pdf.byteLength,
    };
    if (dryRun) {
      return {
        versionId: version.id,
        estado: "enviada" as const,
        manifest,
        correo: correoPreview,
      };
    }
    const ahora = new Date();
    const congelado = JSON.stringify(resultado);
    await ctx.transaccion(async (tx) => {
      await tx.cpqVersion.update({
        where: { id: version.id },
        data: {
          estado: "enviada",
          enviadaEn: ahora,
          ventaMensualClp: resultado.ventaMensual,
          calculoCongeladoJson: congelado,
          marcaDocumentoVersion: pdfPack.marcaVersion,
          plantillaDocumentoId: pdfPack.plantillaId,
          plantillaDocumentoVersion: pdfPack.plantillaVersion,
        },
      });
      if (resultado.ventaMensual != null) {
        await tx.negocio.update({
          where: { id: c.negocioId },
          data: { valorMensual: resultado.ventaMensual },
        });
      }
      await ctx.eventos.emitir(tx, {
        tipo: "cpq.cotizacion.enviada",
        entidadTipo: "cotizacion",
        entidadId: c.id,
        payload: {
          codigo: c.codigo,
          version: version.numero,
          ventaMensual: resultado.ventaMensual,
        },
      });
    });
    if (ctx.actor.tipo !== "agent" && para) {
      await enviarCorreo(
        { db: ctx.db, tenantId: ctx.tenantId, correo: ctx.servicios.correo, urlBase: ctx.servicios.urlBase },
        "cpq.cotizacion.enviada",
        para,
        correoPreview.datos,
      );
    }
    return {
      versionId: version.id,
      estado: "enviada" as const,
      manifest,
      correo: correoPreview,
    };
  },
});

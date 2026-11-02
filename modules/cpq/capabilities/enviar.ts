import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { pdfCotizacionConMarca } from "../persistencia/pdf-cotizacion";
import { cargarFilasVersion, proyectarCalculo, recalcularVersion } from "../persistencia/recalcular";
import { exigirBorrador } from "../persistencia/version";
import { commitEnviarCotizacion } from "./enviar-commit";
import { manifestEnviarSchema, previewCorreoEnviarSchema } from "./enviar-esquemas";
import { uuidSchema } from "./esquemas";
import { PERMISO_MANAGE } from "./permisos";
import { cotizacionDe } from "./util";

export const cotizacionesEnviar = defineCapability({
  id: "cpq.cotizaciones.enviar",
  descripcion:
    "Congela la versión editable, guarda el cálculo, actualiza el valor mensual del negocio, mueve a «Propuesta enviada», registra el PDF y envía correo al contacto.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    id: uuidSchema,
    contactoId: uuidSchema,
    mensaje: z.string().trim().max(2000).optional(),
  }),
  output: z.object({
    versionId: uuidSchema,
    estado: z.literal("enviada"),
    documentoId: uuidSchema,
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
      select: {
        id: true,
        titulo: true,
        valorMensual: true,
        cuentaId: true,
        embudoId: true,
        etapaId: true,
        estado: true,
        createdAt: true,
      },
    });
    if (!neg?.cuentaId) throw reglaDeNegocio("El negocio no tiene cuenta asociada.");
    const contacto = await ctx.db.contacto.findFirst({
      where: { id: input.contactoId },
      select: { email: true, cuentaId: true, tenantId: true },
    });
    if (!contacto) throw noEncontrado("El contacto");
    if (contacto.tenantId !== ctx.tenantId) {
      throw reglaDeNegocio("El contacto no pertenece a la empresa de la sesión.");
    }
    if (contacto.cuentaId !== neg.cuentaId) {
      throw reglaDeNegocio("El contacto no pertenece a la cuenta del negocio.");
    }
    if (!contacto.email?.trim()) {
      throw reglaDeNegocio("El contacto debe tener correo para enviar la propuesta.");
    }
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
    const pdfPack = await pdfCotizacionConMarca(
      ctx,
      {
        codigo: c.codigo,
        titulo: c.titulo,
        negocio: neg.titulo ?? "Negocio",
        secciones: seccionesVista,
        calculo: {
          ventaMensual: calculoPublico.ventaMensual ?? null,
          fecha: calculoPublico.fecha ?? "",
          pagosUnicos: "pagosUnicos" in calculoPublico ? calculoPublico.pagosUnicos : 0,
        },
      },
      undefined,
      { siembraDocumento: !dryRun },
    );
    const correoPreview = {
      evento: "cpq.cotizacion.enviada" as const,
      para: contacto.email,
      asunto: `Propuesta ${c.codigo}`,
      datos: {
        codigo: c.codigo,
        titulo: c.titulo,
        negocio: neg.titulo ?? "",
        ventaMensual: calculoPublico.ventaMensual,
        mensaje: input.mensaje ?? "",
      },
    };
    const manifest = {
      codigo: c.codigo,
      titulo: c.titulo,
      negocioTitulo: neg.titulo ?? null,
      secciones: seccionesVista,
      calculo: calculoPublico,
      pdfBytes: pdfPack.bytes.byteLength,
    };
    if (dryRun) {
      return {
        versionId: version.id,
        estado: "enviada" as const,
        documentoId: c.id,
        manifest,
        correo: correoPreview,
      };
    }
    const documentoId = await commitEnviarCotizacion(ctx, {
      cotizacionId: c.id,
      codigo: c.codigo,
      negocioId: c.negocioId,
      versionId: version.id,
      versionNumero: version.numero,
      contactoId: input.contactoId,
      pdf: pdfPack.bytes,
      pdfPack,
      resultado,
      neg,
      correoPreview,
    });
    return {
      versionId: version.id,
      estado: "enviada" as const,
      documentoId,
      manifest,
      correo: correoPreview,
    };
  },
});

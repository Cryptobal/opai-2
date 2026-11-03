import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { pdfCotizacionConMarca } from "../persistencia/pdf-cotizacion";
import { entradaPdfDesdeCotizacion } from "../persistencia/entrada-pdf-cotizacion";
import { exigirGatesEnvioCpq } from "../persistencia/propuesta-envio-aprobacion";
import { registrarOEnviarSolicitudEnvioPropuesta } from "../persistencia/propuesta-envio-solicitar";
import { proyectarCalculo } from "../persistencia/recalcular";
import { manifestEnviarSchema, previewCorreoEnviarSchema } from "./enviar-esquemas";
import { uuidSchema } from "./esquemas";
import { PERMISO_MANAGE } from "./permisos";
import { cotizacionDe } from "./util";

export const cotizacionesEnviar = defineCapability({
  interna: true,
  id: "cpq.cotizaciones.enviar",
  descripcion:
    "Legacy: delega en el envío conjunto (cpq.envios_propuesta.solicitar). No expuesto en MCP; usar envíos desde la ficha.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    id: uuidSchema,
    contactoId: uuidSchema,
    mensaje: z.string().trim().max(2000).optional(),
    confirmarValoresViejos: z.boolean().optional(),
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
    const neg = await ctx.db.negocio.findFirst({
      where: { id: c.negocioId },
      select: { cuentaId: true, titulo: true },
    });
    if (!neg?.cuentaId) throw reglaDeNegocio("El negocio no tiene cuenta asociada.");
    const contacto = await ctx.db.contacto.findFirst({
      where: { id: input.contactoId },
      select: { email: true, cuentaId: true, tenantId: true, nombres: true, apellidos: true },
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
    const { pack, resultado } = await exigirGatesEnvioCpq(
      ctx,
      input.id,
      input.confirmarValoresViejos,
      dryRun,
    );
    const { version, secciones, lineas } = pack;
    const calculoPublico = proyectarCalculo(ctx, resultado);
    const seccionesVista = secciones.map((s) => ({
      nombre: s.nombre,
      lineas: lineas
        .filter((l) => l.seccionId === s.id)
        .map((l) => ({ nombre: l.nombre, tipo: l.tipo })),
    }));
    const nombreContacto = `${contacto.nombres} ${contacto.apellidos}`.trim();
    const destinatarios = [
      {
        email: contacto.email.trim(),
        contactoId: input.contactoId,
        ...(nombreContacto ? { nombre: nombreContacto } : {}),
      },
    ];
    const solicitud = await registrarOEnviarSolicitudEnvioPropuesta(
      ctx,
      {
        cotizacionId: c.id,
        versionId: version.id,
        propuestaTecnicaId: null,
        incluyeCotizacion: true,
        incluyePropuesta: false,
        destinatarios,
        creadoPorId: c.creadoPorId,
        resultado,
        ...(input.mensaje !== undefined ? { mensaje: input.mensaje } : {}),
      },
      dryRun,
    );
    if (solicitud.estado === "pendiente_aprobacion") {
      throw reglaDeNegocio(
        "Fuera de márgenes: el envío queda pendiente de aprobación. Usa cpq.envios_propuesta.solicitar desde la ficha.",
      );
    }
    const entrada =
      (await entradaPdfDesdeCotizacion(ctx, input.id, { enviada: true })) ?? {
        codigo: c.codigo,
        titulo: c.titulo,
        negocio: neg.titulo ?? "Negocio",
        secciones: seccionesVista.map((s) => ({
          nombre: s.nombre,
          lineas: s.lineas.map((l) => ({ nombre: l.nombre, tipo: l.tipo })),
        })),
        calculo: {
          ventaMensual: calculoPublico.ventaMensual ?? null,
          fecha: calculoPublico.fecha ?? "",
          pagosUnicos: "pagosUnicos" in calculoPublico ? calculoPublico.pagosUnicos : 0,
          borradorSinPrecio: calculoPublico.ventaMensual == null,
        },
      };
    const pdfPack = await pdfCotizacionConMarca(ctx, entrada, undefined, { siembraDocumento: false });
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
    let documentoId = c.id;
    if (!dryRun) {
      const vinculo = await ctx.db.documentoVinculo.findFirst({
        where: { entidadId: c.id, entidadTipo: "cotizacion" },
        orderBy: { createdAt: "desc" },
        select: { documentoId: true },
      });
      documentoId = vinculo?.documentoId ?? c.id;
    }
    return {
      versionId: version.id,
      estado: "enviada" as const,
      documentoId,
      manifest,
      correo: correoPreview,
    };
  },
});

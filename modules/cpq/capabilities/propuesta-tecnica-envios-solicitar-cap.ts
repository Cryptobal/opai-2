import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { exigirDestinatariosEnvio } from "../domain/documento/propuesta-tecnica";
import { previsualizarCorreoCliente } from "../persistencia/correo-cliente";
import { exigirGatesEnvioCpq } from "../persistencia/propuesta-envio-aprobacion";
import {
  exigirVersionDeCotizacion,
  validarDestinatariosEnvioCuenta,
} from "../persistencia/propuesta-envio-destinatarios";
import { registrarOEnviarSolicitudEnvioPropuesta } from "../persistencia/propuesta-envio-solicitar";
import { PERMISO_MANAGE } from "./permisos";
import { destinatarioSchema } from "./propuesta-tecnica-esquemas";
import { uuidSchema } from "./esquemas";
import { cotizacionDe } from "./util";

export const enviosPropuestaSolicitar = defineCapability({
  id: "cpq.envios_propuesta.solicitar",
  descripcion:
    "Envía o prepara envío conjunto: dentro de márgenes sale en un paso; fuera queda pendiente salvo owner/admin.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    cotizacionId: uuidSchema,
    incluyeCotizacion: z.boolean().default(true),
    incluyePropuesta: z.boolean().default(false),
    propuestaTecnicaId: uuidSchema.optional(),
    destinatarios: z.array(destinatarioSchema).min(1),
    mensaje: z.string().trim().max(2000).optional(),
    confirmarValoresViejos: z.boolean().optional(),
  }),
  output: z.object({
    envioId: z.string(),
    estado: z.enum(["pendiente_aprobacion", "enviado"]),
    destinatarios: z.array(destinatarioSchema),
    correos: z
      .array(
        z.object({
          para: z.string(),
          asunto: z.string(),
          texto: z.string(),
          adjuntos: z.array(z.string()),
          enlazados: z.array(z.string()),
          acceso: z.enum(["ya_tiene_acceso", "vinculado", "invitado", "invitacion_pendiente", "no_aplica"]),
        }),
      )
      .optional()
      .describe("Solo en la vista previa: el correo que recibiría cada destinatario y qué pasaría con su acceso al portal."),
  }),
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, input, { dryRun }) {
    const destinatarios = exigirDestinatariosEnvio(
      input.destinatarios.map((d) => ({
        email: d.email,
        ...(d.contactoId ? { contactoId: d.contactoId } : {}),
        ...(d.nombre ? { nombre: d.nombre } : {}),
      })),
    );
    const c = await cotizacionDe(ctx, input.cotizacionId);
    const neg = await ctx.db.negocio.findFirst({
      where: { id: c.negocioId },
      select: { cuentaId: true },
    });
    await validarDestinatariosEnvioCuenta(ctx, neg?.cuentaId, destinatarios);
    if (input.incluyePropuesta && !input.propuestaTecnicaId) {
      throw reglaDeNegocio("Falta la propuesta técnica para enviar.");
    }
    if (input.propuestaTecnicaId) {
      const prop = await ctx.db.cpqPropuestaTecnica.findFirst({
        where: { id: input.propuestaTecnicaId, cotizacionId: c.id },
      });
      if (!prop) throw noEncontrado("La propuesta técnica");
    }
    const { pack, resultado, versionEsperada } = await exigirGatesEnvioCpq(
      ctx,
      input.cotizacionId,
      input.confirmarValoresViejos,
      dryRun,
    );
    exigirVersionDeCotizacion(pack.version, c.id);
    const resultadoEnvio = await registrarOEnviarSolicitudEnvioPropuesta(
      ctx,
      {
        cotizacionId: c.id,
        versionId: pack.version.id,
        propuestaTecnicaId: input.propuestaTecnicaId ?? null,
        incluyeCotizacion: input.incluyeCotizacion,
        incluyePropuesta: input.incluyePropuesta,
        destinatarios,
        creadoPorId: c.creadoPorId,
        resultado,
        versionEsperada,
        ...(input.mensaje !== undefined ? { mensaje: input.mensaje } : {}),
      },
      dryRun,
    );
    if (!dryRun || !neg?.cuentaId) return resultadoEnvio;
    const pdfs = [
      ...(input.incluyeCotizacion
        ? [{ clave: "cotizacion" as const, nombre: `Cotizacion-${c.codigo}.pdf`, bytes: 0, contenido: null, storageKey: null }]
        : []),
      ...(input.incluyePropuesta
        ? [{ clave: "propuesta" as const, nombre: `Propuesta-tecnica-${c.codigo}.pdf`, bytes: 0, contenido: null, storageKey: null }]
        : []),
    ];
    const correos = [];
    for (const d of destinatarios) {
      correos.push(
        await previsualizarCorreoCliente(ctx, {
          para: d.email,
          contactoId: d.contactoId ?? null,
          cuentaId: neg.cuentaId,
          codigo: c.codigo,
          titulo: c.titulo,
          version: pack.version.numero,
          mensaje: input.mensaje ?? "",
          pdfs,
        }),
      );
    }
    return { ...resultadoEnvio, correos };
  },
});

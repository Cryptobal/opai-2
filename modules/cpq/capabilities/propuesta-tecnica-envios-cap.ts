import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { exigirDestinatariosEnvio } from "../domain/documento/propuesta-tecnica";
import { listarEnviosPropuesta, registrarEnvioPropuesta } from "../persistencia/propuesta-envio";
import { congelarPropuestaTecnica } from "../persistencia/propuesta-tecnica";
import { plantillaActivaPropuesta, vistaPlantillaPropuesta } from "../persistencia/plantilla-propuesta";
import { cargarFilasVersion } from "../persistencia/recalcular";
import { PERMISO_ENVIOS_APROBAR, PERMISO_MANAGE, PERMISO_READ } from "./permisos";
import { destinatarioSchema } from "./propuesta-tecnica-esquemas";
import { uuidSchema } from "./esquemas";
import { cotizacionDe } from "./util";

export const enviosPropuestaList = defineCapability({
  id: "cpq.envios_propuesta.list",
  descripcion: "Historial de envíos de cotización/propuesta técnica.",
  permiso: PERMISO_READ,
  input: z.object({ cotizacionId: uuidSchema }),
  output: z.object({
    envios: z.array(
      z.object({
        id: z.string(),
        estado: z.string(),
        incluyeCotizacion: z.boolean(),
        incluyePropuesta: z.boolean(),
        enviadoEn: z.string().nullable(),
        snapshotJson: z.string(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const rows = await listarEnviosPropuesta(ctx, input.cotizacionId);
    return {
      envios: rows.map((r) => ({
        id: r.id,
        estado: r.estado,
        incluyeCotizacion: r.incluyeCotizacion,
        incluyePropuesta: r.incluyePropuesta,
        enviadoEn: r.enviadoEn?.toISOString() ?? null,
        snapshotJson: r.snapshotJson,
      })),
    };
  },
});

export const enviosPropuestaSolicitar = defineCapability({
  id: "cpq.envios_propuesta.solicitar",
  descripcion: "Prepara envío conjunto; congela snapshot y deja pendiente de aprobación.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    cotizacionId: uuidSchema,
    incluyeCotizacion: z.boolean().default(true),
    incluyePropuesta: z.boolean().default(false),
    propuestaTecnicaId: uuidSchema.optional(),
    destinatarios: z.array(destinatarioSchema).min(1),
    mensaje: z.string().trim().max(2000).optional(),
  }),
  output: z.object({
    envioId: z.string(),
    estado: z.enum(["pendiente_aprobacion", "enviado"]),
    destinatarios: z.array(destinatarioSchema),
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
    const pack = await cargarFilasVersion(ctx, input.cotizacionId, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    if (input.incluyePropuesta && !input.propuestaTecnicaId) {
      throw reglaDeNegocio("Falta la propuesta técnica para enviar.");
    }
    const plantilla = vistaPlantillaPropuesta(await plantillaActivaPropuesta(ctx));
    const snapshot = {
      marcaDocumentoVersion: 1,
      plantillaDocumentoId: plantilla.id,
      plantillaDocumentoVersion: plantilla.version,
      bloquesBiblioteca: {},
      propuestaBloquesJson: input.propuestaTecnicaId
        ? (await ctx.db.cpqPropuestaTecnica.findFirst({ where: { id: input.propuestaTecnicaId } }))?.bloquesJson ?? "[]"
        : "[]",
      destinatarios,
    };
    if (dryRun) {
      return { envioId: "00000000-0000-0000-0000-000000000000", estado: "pendiente_aprobacion" as const, destinatarios };
    }
    const envio = await registrarEnvioPropuesta(ctx, {
      cotizacionId: c.id,
      versionId: pack.version.id,
      propuestaTecnicaId: input.propuestaTecnicaId ?? null,
      incluyeCotizacion: input.incluyeCotizacion,
      incluyePropuesta: input.incluyePropuesta,
      destinatariosJson: JSON.stringify(destinatarios),
      snapshot,
      ...(input.mensaje !== undefined ? { mensaje: input.mensaje } : {}),
      solicitadoPorId: ctx.actor.id ?? c.creadoPorId,
      enviado: false,
    });
    if (input.propuestaTecnicaId) await congelarPropuestaTecnica(ctx, input.propuestaTecnicaId);
    return { envioId: envio.id, estado: "pendiente_aprobacion" as const, destinatarios };
  },
});

export const enviosPropuestaAprobar = defineCapability({
  id: "cpq.envios_propuesta.aprobar",
  descripcion: "Aprueba un envío pendiente (cpq:envios.aprobar).",
  permiso: PERMISO_ENVIOS_APROBAR,
  input: z.object({ envioId: uuidSchema }),
  output: z.object({ envioId: z.string(), estado: z.literal("enviado") }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const row = await ctx.db.cpqPropuestaEnvio.findFirst({ where: { id: input.envioId } });
    if (!row) throw noEncontrado("El envío");
    if (row.estado !== "pendiente_aprobacion") throw reglaDeNegocio("El envío no está pendiente.");
    if (dryRun) return { envioId: row.id, estado: "enviado" as const };
    const actorId = ctx.actor.id;
    if (!actorId) throw reglaDeNegocio("Se requiere una persona aprobadora.");
    await ctx.db.cpqPropuestaEnvio.update({
      where: { id: row.id },
      data: { estado: "enviado", enviadoEn: new Date(), aprobadoPorId: actorId },
    });
    return { envioId: row.id, estado: "enviado" as const };
  },
});

import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { snapshotParaLectura } from "../domain/documento/propuesta-campos";
import { listarEnviosPropuesta } from "../persistencia/propuesta-envio";
import {
  exigirDecisorEnvioPropuesta,
  exigirGatesEnvioCpq,
} from "../persistencia/propuesta-envio-aprobacion";
import { ejecutarEnvioPropuestaAprobado } from "../persistencia/propuesta-envio-ejecutar";
import { PERMISO_ENVIOS_APROBAR, PERMISO_READ } from "./permisos";
import { uuidSchema } from "./esquemas";
import { cotizacionDe } from "./util";

export const enviosPropuestaList = defineCapability({
  id: "cpq.envios_propuesta.list",
  descripcion: "Historial de envíos de cotización/propuesta técnica.",
  permiso: PERMISO_READ,
  auditarLectura: (s) => s.envios.map((e) => e.id),
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
    await cotizacionDe(ctx, input.cotizacionId);
    const rows = await listarEnviosPropuesta(ctx, input.cotizacionId);
    return {
      envios: rows.map((r) => ({
        id: r.id,
        estado: r.estado,
        incluyeCotizacion: r.incluyeCotizacion,
        incluyePropuesta: r.incluyePropuesta,
        enviadoEn: r.enviadoEn?.toISOString() ?? null,
        snapshotJson: snapshotParaLectura(r.snapshotJson),
      })),
    };
  },
});

export const enviosPropuestaAprobar = defineCapability({
  id: "cpq.envios_propuesta.aprobar",
  descripcion: "Aprueba un envío pendiente y ejecuta el envío real (PDF y correos).",
  permiso: PERMISO_ENVIOS_APROBAR,
  input: z.object({
    envioId: uuidSchema,
    confirmarValoresViejos: z.boolean().optional(),
  }),
  output: z.object({
    envioId: z.string(),
    estado: z.literal("enviado"),
    autoaprobacion: z.boolean(),
  }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const row = await ctx.db.cpqPropuestaEnvio.findFirst({ where: { id: input.envioId } });
    if (!row) throw noEncontrado("El envío");
    if (row.estado !== "pendiente_aprobacion") throw reglaDeNegocio("El envío no está pendiente.");
    const { resultado, versionEsperada } = await exigirGatesEnvioCpq(
      ctx,
      row.cotizacionId,
      input.confirmarValoresViejos,
      dryRun,
    );
    const evaluacion = exigirDecisorEnvioPropuesta(ctx, row.solicitadoPorId);
    if (dryRun) {
      return { envioId: row.id, estado: "enviado" as const, autoaprobacion: evaluacion.autoaprobacion };
    }
    const actorId = ctx.actor.id;
    if (!actorId) throw reglaDeNegocio("Se requiere una persona aprobadora.");
    await ejecutarEnvioPropuestaAprobado(ctx, row, {
      actorId,
      autoaprobacion: evaluacion.autoaprobacion,
      envioDirectoDentroMargen: false,
      resultado,
      versionEsperada,
    });
    return { envioId: row.id, estado: "enviado" as const, autoaprobacion: evaluacion.autoaprobacion };
  },
});

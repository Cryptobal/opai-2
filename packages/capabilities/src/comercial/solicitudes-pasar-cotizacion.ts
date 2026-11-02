import { z } from "zod";

import { defineCapability } from "../define";
import { ErrorCapacidad, noEncontrado, prohibido, reglaDeNegocio } from "../errores";
import { executeCapability } from "../execute";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_SOLICITUDES_MANAGE, idSolicitud, solicitudDe } from "./solicitudes-comun";

export const solicitudesPasarACotizacion = defineCapability({
  id: "comercial.solicitudes.pasar_a_cotizacion",
  descripcion:
    "Abre una cotización CPQ en el negocio de una solicitud ya convertida, reutilizando el negocio vinculado.",
  permiso: PERMISO_SOLICITUDES_MANAGE,
  input: idSolicitud.extend({
    titulo: z.string().trim().min(3).max(160).optional(),
  }),
  output: z.object({
    cotizacionId: uuidSchema,
    codigo: z.string(),
    versionId: uuidSchema,
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!ctx.autorizar("cpq:cotizaciones.manage") || !ctx.autorizar("comercial:solicitudes.manage"))
      throw prohibido("Se requieren permisos de solicitudes y de cotizaciones.");
    const s = await solicitudDe(ctx, input.id);
    if (s.estado !== "convertida") throw reglaDeNegocio("La solicitud debe estar convertida.");
    if (!s.negocioId) throw reglaDeNegocio("La solicitud convertida no tiene negocio vinculado.");
    const negocio = await ctx.db.negocio.findFirst({ where: { id: s.negocioId } });
    if (!negocio) throw noEncontrado("El negocio");
    const titulo =
      input.titulo ??
      (s.servicio ? `Cotización · ${String(s.servicio).slice(0, 120)}` : "Cotización comercial");
    const r = await executeCapability(
      ctx,
      "cpq.cotizaciones.create",
      { negocioId: s.negocioId, titulo },
      { dryRun },
    );
    if (!r.ok) throw new ErrorCapacidad(r.error.code, r.error.message, r.error.detalles);
    const data = r.data as { id: string; codigo: string; versionId: string };
    return { cotizacionId: data.id, codigo: data.codigo, versionId: data.versionId };
  },
});

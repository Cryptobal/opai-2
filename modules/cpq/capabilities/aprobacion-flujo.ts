import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { marcarLista, solicitarAprobacionMargen } from "../persistencia/aprobacion-margen";
import { cargarFilasVersion, recalcularVersion } from "../persistencia/recalcular";
import { exigirEditable } from "../persistencia/version";
import { uuidSchema } from "./esquemas";
import { PERMISO_MANAGE } from "./permisos";
import { cotizacionDe } from "./util";

const salidaEstado = z.object({ estado: z.string(), aprobacionId: uuidSchema.optional() });

export const cotizacionesSolicitarAprobacion = defineCapability({
  id: "cpq.cotizaciones.solicitar_aprobacion",
  descripcion:
    "Pide aprobación de owner o admin cuando el margen queda bajo el mínimo o la cotización está subvalorada.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema, comentario: z.string().trim().max(500).optional() }),
  output: salidaEstado,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await cotizacionDe(ctx, input.id);
    const pack = await cargarFilasVersion(ctx, input.id, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    exigirEditable(pack.version);
    const resultado = await recalcularVersion(ctx, input.id, undefined, false);
    if (!resultado) throw noEncontrado("La versión");
    if (dryRun) {
      return { estado: "en_aprobacion" as const, aprobacionId: pack.version.id };
    }
    const r = await solicitarAprobacionMargen(ctx, pack.version.id, resultado, input.comentario);
    return r;
  },
});

export const cotizacionesMarcarLista = defineCapability({
  id: "cpq.cotizaciones.marcar_lista",
  descripcion:
    "Deja la versión editable en estado lista cuando el margen cumple el mínimo y no hay costos pendientes.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema }),
  output: z.object({ estado: z.literal("lista") }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await cotizacionDe(ctx, input.id);
    const pack = await cargarFilasVersion(ctx, input.id, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    exigirEditable(pack.version);
    const resultado = await recalcularVersion(ctx, input.id, undefined, false);
    if (!resultado) throw noEncontrado("La versión");
    if (dryRun) return { estado: "lista" as const };
    return marcarLista(ctx, pack.version.id, resultado);
  },
});

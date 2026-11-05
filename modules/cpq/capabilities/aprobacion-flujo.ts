import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { marcarLista, solicitarAprobacionMargen } from "../persistencia/aprobacion-margen";
import { reabrirParaEditar } from "../persistencia/reabrir";
import { cargarFilasVersion, recalcularVersion } from "../persistencia/recalcular";
import {
  entradaEstadoFicha,
  exigirParaMarcarLista,
  exigirParaPedirAprobacion,
} from "../persistencia/requisitos";
import { aprobacionPendiente } from "../persistencia/aprobacion-reglas";
import { exigirBorrador } from "../persistencia/version";
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
    // Repetir el pedido es idempotente: devuelve el que ya está pendiente sin recalcular.
    if (pack.version.estado === "en_aprobacion") {
      const prev = await aprobacionPendiente(ctx, pack.version.id);
      if (prev) return { estado: "en_aprobacion" as const, aprobacionId: prev.id };
    }
    exigirBorrador(pack.version);
    const resultado = await recalcularVersion(ctx, input.id, undefined, false);
    if (!resultado) throw noEncontrado("La versión");
    exigirParaPedirAprobacion(await entradaEstadoFicha(ctx, pack.version, pack.lineas, resultado));
    if (dryRun) return { estado: "en_aprobacion" as const, aprobacionId: pack.version.id };
    const r = await solicitarAprobacionMargen(ctx, pack.version.id, resultado, input.comentario);
    return r;
  },
});

export const cotizacionesMarcarLista = defineCapability({
  id: "cpq.cotizaciones.marcar_lista",
  descripcion:
    "Deja la versión en borrador en estado lista (congelada) cuando tiene líneas, no hay costos pendientes, los valores legales están al día y el margen cumple el mínimo.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema }),
  output: z.object({ estado: z.literal("lista") }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await cotizacionDe(ctx, input.id);
    const pack = await cargarFilasVersion(ctx, input.id, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    exigirBorrador(pack.version);
    const resultado = await recalcularVersion(ctx, input.id, undefined, false);
    if (!resultado) throw noEncontrado("La versión");
    exigirParaMarcarLista(await entradaEstadoFicha(ctx, pack.version, pack.lineas, resultado));
    if (dryRun) return { estado: "lista" as const };
    return marcarLista(ctx, pack.version.id, resultado);
  },
});

export const cotizacionesReabrir = defineCapability({
  id: "cpq.cotizaciones.reabrir",
  descripcion:
    "Reabre para editar una cotización que está lista: vuelve a borrador y se recalcula. Si el margen queda bajo el mínimo, hay que pedir aprobación de nuevo.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema }),
  output: z.object({ estado: z.literal("borrador") }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await cotizacionDe(ctx, input.id);
    const pack = await cargarFilasVersion(ctx, input.id, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    if (pack.version.estado !== "lista")
      throw reglaDeNegocio("Solo se reabre una cotización que está lista; las demás se editan o se versionan.");
    if (dryRun) return { estado: "borrador" as const };
    return reabrirParaEditar(ctx, pack.version.id);
  },
});

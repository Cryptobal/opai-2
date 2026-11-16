import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { BASES_PLANTILLA } from "../domain/documento/bloques";
import {
  parseBloquesArmadorPropuesta,
  type BloqueArmadorPropuesta,
} from "../domain/documento/propuesta-tecnica";
import { plantillaHtmlEnUso } from "../persistencia/propuesta-html-uso";
import {
  actualizarPropuestaArmador,
  propuestaServicioDesactualizado,
  servicioDesdeFilas,
  sincronizarServicioDesdeCotizacion,
} from "../persistencia/propuesta-tecnica";
import { cargarFilasVersion, packServicioCotizacion } from "../persistencia/recalcular";
import { PERMISO_MANAGE, PERMISO_READ } from "./permisos";
import { bloqueArmadorSchema } from "./propuesta-tecnica-esquemas";
import { uuidSchema } from "./esquemas";
import { cotizacionDe } from "./util";

export const propuestaTecnicaGet = defineCapability({
  auditarLectura: (s) => (s ? [s.id, s.cotizacionId] : []),
  id: "cpq.propuestas_tecnica.get",
  descripcion: "Lee el armador de propuesta técnica de la cotización (no crea filas).",
  permiso: PERMISO_READ,
  input: z.object({ cotizacionId: uuidSchema }),
  output: z
    .object({
      id: z.string(),
      cotizacionId: z.string(),
      versionId: z.string(),
      base: z.enum(BASES_PLANTILLA),
      estado: z.enum(["borrador", "congelada"]),
      bloques: z.array(bloqueArmadorSchema),
      servicioDesactualizado: z.boolean(),
      editadoParaCliente: z.boolean(),
      codigo: z.string(),
      versionNumero: z.number().int(),
      documento: z.object({
        origen: z.enum(["html_empresa", "html_opai"]),
        nombre: z.string().nullable(),
        version: z.number().int().nullable(),
      }),
    })
    .nullable(),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const c = await cotizacionDe(ctx, input.cotizacionId);
    const pack = await cargarFilasVersion(ctx, input.cotizacionId, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    const prop = await ctx.db.cpqPropuestaTecnica.findFirst({ where: { versionId: pack.version.id } });
    if (!prop) return null;
    const servicio = servicioDesdeFilas(packServicioCotizacion(c, pack));
    const html = await plantillaHtmlEnUso(ctx);
    return {
      id: prop.id,
      cotizacionId: prop.cotizacionId,
      versionId: prop.versionId,
      base: prop.base as (typeof BASES_PLANTILLA)[number],
      estado: prop.estado as "borrador" | "congelada",
      bloques: parseBloquesArmadorPropuesta(prop.bloquesJson),
      servicioDesactualizado: propuestaServicioDesactualizado(prop, servicio),
      editadoParaCliente: prop.editadoParaCliente,
      codigo: c.codigo,
      versionNumero: pack.version.numero,
      documento: html
        ? { origen: "html_empresa" as const, nombre: html.nombre, version: html.version }
        : { origen: "html_opai" as const, nombre: null, version: null },
    };
  },
});

export const propuestaTecnicaUpdate = defineCapability({
  id: "cpq.propuestas_tecnica.update",
  descripcion: "Guarda bloques del armador de propuesta técnica.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    id: uuidSchema,
    bloques: z.array(bloqueArmadorSchema).optional(),
    base: z.enum(BASES_PLANTILLA).optional(),
    editadoParaCliente: z.boolean().optional(),
  }),
  output: z.object({ id: z.string(), estado: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const row = await actualizarPropuestaArmador(
      ctx,
      input.id,
      {
        ...(input.bloques !== undefined ? { bloques: input.bloques as BloqueArmadorPropuesta[] } : {}),
        ...(input.base !== undefined ? { base: input.base } : {}),
        ...(input.editadoParaCliente !== undefined ? { editadoParaCliente: input.editadoParaCliente } : {}),
      },
      !dryRun,
    );
    return { id: row.id, estado: row.estado };
  },
});

export const propuestaTecnicaSyncServicio = defineCapability({
  id: "cpq.propuestas_tecnica.sync_servicio",
  descripcion: "Actualiza la sección del servicio desde la cotización vigente.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema, cotizacionId: uuidSchema }),
  output: z.object({ id: z.string(), servicioDesactualizado: z.literal(false) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = await cotizacionDe(ctx, input.cotizacionId);
    const pack = await cargarFilasVersion(ctx, input.cotizacionId, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    await sincronizarServicioDesdeCotizacion(ctx, input.id, servicioDesdeFilas(packServicioCotizacion(c, pack)), !dryRun);
    return { id: input.id, servicioDesactualizado: false as const };
  },
});

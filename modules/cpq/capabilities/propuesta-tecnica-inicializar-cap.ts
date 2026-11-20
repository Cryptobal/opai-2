import { z } from "zod";

import { defineCapability, noEncontrado, idAutor } from "@opai/capabilities";

import { type BasePlantilla } from "../domain/documento/bloques";
import { parseBloquesArmadorPropuesta } from "../domain/documento/propuesta-tecnica";
import { textosPorDefecto } from "../persistencia/propuesta-textos-defecto";
import {
  obtenerOCrearPropuestaTecnica,
  propuestaInicial,
  propuestaServicioDesactualizado,
  servicioDesdeFilas,
} from "../persistencia/propuesta-tecnica";
import { cargarFilasVersion, packServicioCotizacion } from "../persistencia/recalcular";
import { PERMISO_MANAGE } from "./permisos";
import { armadorPropuestaVistaSchema } from "./propuesta-tecnica-esquemas";
import { uuidSchema } from "./esquemas";
import { cotizacionDe } from "./util";

export const propuestaTecnicaInicializar = defineCapability({
  id: "cpq.propuestas_tecnica.inicializar",
  descripcion: "Crea el armador de propuesta técnica para la versión vigente de la cotización.",
  permiso: PERMISO_MANAGE,
  input: z.object({ cotizacionId: uuidSchema }),
  output: armadorPropuestaVistaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = await cotizacionDe(ctx, input.cotizacionId);
    const pack = await cargarFilasVersion(ctx, input.cotizacionId, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    const existente = await ctx.db.cpqPropuestaTecnica.findFirst({ where: { versionId: pack.version.id } });
    const prop =
      existente ??
      (dryRun
        ? null
        : await obtenerOCrearPropuestaTecnica(ctx, c.id, pack.version.id, idAutor(ctx.actor) ?? c.creadoPorId));
    if (!prop) {
      const { base, bloques } = await propuestaInicial(ctx);
      return {
        id: "00000000-0000-0000-0000-000000000001",
        cotizacionId: c.id,
        versionId: pack.version.id,
        base,
        estado: "borrador" as const,
        bloques,
        textosPorDefecto: await textosPorDefecto(ctx, bloques),
        servicioDesactualizado: false,
        editadoParaCliente: false,
        codigo: c.codigo,
        versionNumero: pack.version.numero,
      };
    }
    const servicio = servicioDesdeFilas(packServicioCotizacion(c, pack));
    const bloques = parseBloquesArmadorPropuesta(prop.bloquesJson);
    return {
      id: prop.id,
      cotizacionId: prop.cotizacionId,
      versionId: prop.versionId,
      base: prop.base as BasePlantilla,
      estado: prop.estado as "borrador" | "congelada",
      bloques,
      textosPorDefecto: await textosPorDefecto(ctx, bloques),
      servicioDesactualizado: propuestaServicioDesactualizado(prop, servicio),
      editadoParaCliente: prop.editadoParaCliente,
      codigo: c.codigo,
      versionNumero: pack.version.numero,
    };
  },
});

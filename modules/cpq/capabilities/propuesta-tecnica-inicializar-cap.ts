import { z } from "zod";

import { defineCapability, noEncontrado, idAutor } from "@opai/capabilities";

import { type BasePlantilla } from "../domain/documento/bloques";
import {
  basePropuestaDesdeCotizacion,
  parseBloquesArmadorPropuesta,
  type BloqueArmadorPropuesta,
} from "../domain/documento/propuesta-tecnica";
import { plantillaActivaCotizacionLectura } from "../persistencia/plantilla-documento";
import { plantillaActivaPropuesta, vistaPlantillaPropuesta } from "../persistencia/plantilla-propuesta";
import {
  obtenerOCrearPropuestaTecnica,
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
      const plantillaCot = await plantillaActivaCotizacionLectura(ctx);
      const plantillaProp = vistaPlantillaPropuesta(await plantillaActivaPropuesta(ctx));
      const base = basePropuestaDesdeCotizacion(plantillaCot.base, plantillaProp.base as BasePlantilla);
      const bloques: BloqueArmadorPropuesta[] = plantillaProp.bloques
        .filter((b) => b.activo)
        .map((b, i) => ({ ...b, id: `${b.tipo}-${i}` }));
      return {
        id: "00000000-0000-0000-0000-000000000001",
        cotizacionId: c.id,
        versionId: pack.version.id,
        base,
        estado: "borrador" as const,
        bloques,
        servicioDesactualizado: false,
        editadoParaCliente: false,
        codigo: c.codigo,
        versionNumero: pack.version.numero,
      };
    }
    const servicio = servicioDesdeFilas(packServicioCotizacion(c, pack));
    return {
      id: prop.id,
      cotizacionId: prop.cotizacionId,
      versionId: prop.versionId,
      base: prop.base as BasePlantilla,
      estado: prop.estado as "borrador" | "congelada",
      bloques: parseBloquesArmadorPropuesta(prop.bloquesJson),
      servicioDesactualizado: propuestaServicioDesactualizado(prop, servicio),
      editadoParaCliente: prop.editadoParaCliente,
      codigo: c.codigo,
      versionNumero: pack.version.numero,
    };
  },
});

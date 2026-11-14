// Editar un campo personalizado (CAR-27, PR 1): nombre visible, opciones, obligatorio, orden o archivar.
// El tipo y la clave no cambian: los valores guardados y los tokens de documentos dependen de ellos.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { sinDuplicado } from "../maestros/comun";
import {
  campoPersonalizadoSchema,
  etiquetaCampo,
  opcionesCampo,
  opcionesPara,
  vistaCampo,
} from "./campos-personalizados";

export const camposPersonalizadosUpdate = defineCapability({
  id: "core.campos_personalizados.update",
  descripcion:
    "Cambia el nombre visible, las opciones, si es obligatorio o el orden de un campo personalizado, o lo archiva (deja de mostrarse sin borrar lo guardado). Solo cambia lo enviado.",
  permiso: PERMISOS_CORE.camposConfig,
  input: z.object({
    id: uuidSchema,
    etiqueta: etiquetaCampo.optional(),
    opciones: opcionesCampo.optional(),
    obligatorio: z.boolean().optional(),
    orden: z.number().int().min(0).max(10_000).optional(),
    activo: z.boolean().optional(),
  }),
  output: campoPersonalizadoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, opciones, ...cambios }, { dryRun }) {
    const actual = await ctx.db.campoPersonalizado.findFirst({ where: { id } });
    if (!actual) throw noEncontrado("El campo personalizado");
    const data = {
      ...Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined)),
      ...(opciones !== undefined ? { opciones: opcionesPara(actual.tipo, opciones) } : {}),
    };
    if (dryRun) return vistaCampo({ ...actual, ...data });
    const c = await ctx.transaccion(async (tx) => {
      const r = await sinDuplicado(
        tx.campoPersonalizado.update({ where: { id }, data }),
        "Ya existe un campo con ese nombre para esa entidad.",
      );
      await ctx.eventos.emitir(tx, {
        tipo: "core.campo_personalizado.actualizado",
        entidadTipo: "campo_personalizado",
        entidadId: id,
        payload: {},
      });
      return r;
    });
    return vistaCampo(c);
  },
});

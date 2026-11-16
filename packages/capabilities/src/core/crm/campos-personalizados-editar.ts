// Editar un campo personalizado (CAR-27, CAR-536): nombre, ayuda, formato, opciones, valor por
// defecto, obligatorio, orden o archivar. El tipo y la clave no cambian: los valores guardados y los
// tokens de documentos dependen de ellos.
import { Prisma } from "@opai/db";
import { z } from "zod";

import { PERMISOS_CORE, type FormatoNumeroCampo, type TipoCampoPersonalizado } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { sinDuplicado } from "../maestros/comun";
import {
  campoPersonalizadoSchema,
  columnasDefinicion,
  definicionEntrada,
  etiquetaCampo,
  opcionesDe,
  vistaCampo,
} from "./campos-definicion";
import { DUPLICADO_CAMPO } from "./campos-personalizados";

export const camposPersonalizadosUpdate = defineCapability({
  id: "core.campos_personalizados.update",
  descripcion:
    "Cambia el nombre visible, la ayuda, el formato de número, las opciones (etiqueta, valor interno y orden), el valor por defecto, si es obligatorio o el orden de un campo personalizado, o lo archiva (deja de mostrarse sin borrar lo guardado). Solo cambia lo enviado.",
  permiso: PERMISOS_CORE.camposConfig,
  input: z.object({
    id: uuidSchema,
    etiqueta: etiquetaCampo.optional(),
    ...definicionEntrada,
    obligatorio: z.boolean().optional(),
    orden: z.number().int().min(0).max(10_000).optional(),
    activo: z.boolean().optional(),
  }),
  output: campoPersonalizadoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, formato, opciones, valorDefecto, descripcion, ...cambios }, { dryRun }) {
    const actual = await ctx.db.campoPersonalizado.findFirst({ where: { id } });
    if (!actual) throw noEncontrado("El campo personalizado");
    const columnas = columnasDefinicion(actual.tipo as TipoCampoPersonalizado, {
      formato: formato === undefined ? (actual.formato as FormatoNumeroCampo | null) : formato,
      opciones: opciones ?? opcionesDe(actual),
      valorDefecto: valorDefecto === undefined ? actual.valorDefecto : valorDefecto,
    });
    const data = {
      ...Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined)),
      ...(descripcion !== undefined ? { descripcion: descripcion || null } : {}),
      ...columnas,
    };
    if (dryRun) return vistaCampo({ ...actual, ...data });
    const c = await ctx.transaccion(async (tx) => {
      const r = await sinDuplicado(
        tx.campoPersonalizado.update({
          where: { id },
          data: { ...data, valorDefecto: data.valorDefecto ?? Prisma.DbNull },
        }),
        DUPLICADO_CAMPO,
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

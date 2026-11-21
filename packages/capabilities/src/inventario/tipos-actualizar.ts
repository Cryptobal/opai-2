import { LIMITES_TIPO } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import {
  campoEntradaSchema,
  descripcionSchema,
  duplicado,
  nombreSchema,
  PERMISOS_INVENTARIO,
  prendaSchema,
  tallaSchema,
  tipoSchema,
  vistaTipo,
} from "./comun";
import { categoriasDeLaEmpresa } from "./categorias-kit";
import { prepararActualizacionTipo } from "./tipos-actualizar-preparar";

export const tiposActualizar = defineCapability({
  id: "inventario.tipos.actualizar",
  descripcion:
    "Cambia un tipo de inventario: nombre, descripción, campos propios, tallas, prenda del uniforme o si está activo. La categoría no cambia. Un tipo nunca se borra: se desactiva y deja de ofrecerse.",
  permiso: PERMISOS_INVENTARIO.tiposManage,
  input: z.object({
    id: uuidSchema,
    nombre: nombreSchema.optional(),
    descripcion: descripcionSchema.nullable().optional(),
    campos: z.array(campoEntradaSchema).max(LIMITES_TIPO.campos).optional(),
    tallas: z.array(tallaSchema).max(LIMITES_TIPO.tallas).optional(),
    prendaClave: prendaSchema.nullable().optional(),
    entregaAPersona: z.boolean().optional(),
    activo: z.boolean().optional(),
  }),
  output: tipoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const [actual, cats] = await Promise.all([
      ctx.db.inventarioTipo.findFirst({ where: { id: input.id } }),
      categoriasDeLaEmpresa(ctx),
    ]);
    if (!actual) throw noEncontrado("El tipo de inventario");
    const f = await prepararActualizacionTipo(ctx, input, actual);
    const nombre = f.nombre;
    const sinCambios =
      JSON.stringify(vistaTipo(f, cats)) === JSON.stringify(vistaTipo(actual, cats));
    if (dryRun || sinCambios) return vistaTipo(f, cats);
    const guardado = await ctx.transaccion(async (tx) => {
      const t = await sinDuplicado(
        tx.inventarioTipo.update({
          where: { id: actual.id },
          data: {
            nombre: f.nombre,
            nombreNormalizado: f.nombreNormalizado,
            descripcion: f.descripcion,
            campos: f.campos,
            tallas: f.tallas,
            prendaClave: f.prendaClave,
            entregaAPersona: f.entregaAPersona,
            activo: f.activo,
          },
        }),
        duplicado(nombre),
      );
      await ctx.eventos.emitir(tx, {
        tipo: "inventario.tipo.actualizado",
        entidadTipo: "inventario_tipo",
        entidadId: t.id,
        payload: { nombre: t.nombre, activo: t.activo },
      });
      return t;
    });
    return vistaTipo(guardado, cats);
  },
});

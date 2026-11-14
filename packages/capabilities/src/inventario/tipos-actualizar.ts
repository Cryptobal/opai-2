import { camposConClave, errorDeTipo, LIMITES_TIPO, nombreNormalizado, normalizarTalla } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import {
  campoEntradaSchema,
  camposGuardados,
  descripcionSchema,
  duplicado,
  nombreSchema,
  PERMISOS_INVENTARIO,
  prendaSchema,
  tallaSchema,
  tipoSchema,
  vistaTipo,
} from "./comun";
import { exigirPrendaDelKit } from "./prendas";

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
    activo: z.boolean().optional(),
  }),
  output: tipoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.inventarioTipo.findFirst({ where: { id: input.id } });
    if (!actual) throw noEncontrado("El tipo de inventario");
    const guardados = camposGuardados(actual.campos);
    const existentes = new Set(guardados.map((c) => c.clave));
    const desconocida = input.campos?.find((c) => c.clave && !existentes.has(c.clave));
    if (desconocida) throw reglaDeNegocio(`El campo «${desconocida.etiqueta}» no es de este tipo.`);
    const nombre = input.nombre ?? actual.nombre;
    const f = {
      ...actual,
      nombre,
      nombreNormalizado: nombreNormalizado(nombre),
      descripcion: input.descripcion !== undefined ? input.descripcion || null : actual.descripcion,
      campos: input.campos ? camposConClave(input.campos, [...existentes]) : guardados,
      tallas: input.tallas ? input.tallas.map(normalizarTalla) : actual.tallas,
      prendaClave: input.prendaClave !== undefined ? input.prendaClave : actual.prendaClave,
      activo: input.activo ?? actual.activo,
    };
    const categoria = actual.categoria === "ropa" ? "ropa" : "activo";
    const error = errorDeTipo({ categoria, campos: f.campos, tallas: f.tallas });
    if (error) throw reglaDeNegocio(error);
    if (categoria === "activo" && f.prendaClave)
      throw reglaDeNegocio("La prenda del uniforme es solo para tipos de ropa.");
    // Solo una prenda nueva se valida: una que salió del kit no impide editar lo demás.
    if (f.prendaClave && f.prendaClave !== actual.prendaClave) await exigirPrendaDelKit(ctx, f.prendaClave);
    if (f.nombreNormalizado !== actual.nombreNormalizado) {
      const otro = await ctx.db.inventarioTipo.findFirst({
        where: { nombreNormalizado: f.nombreNormalizado, id: { not: actual.id } },
      });
      if (otro) throw conflicto(duplicado(nombre));
    }
    const sinCambios = JSON.stringify(vistaTipo(f)) === JSON.stringify(vistaTipo(actual));
    if (dryRun || sinCambios) return vistaTipo(f);
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
    return vistaTipo(guardado);
  },
});

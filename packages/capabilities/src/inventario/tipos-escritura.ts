import {
  camposConClave,
  CLAVE_CATEGORIA,
  entregaAPersonaPorDefecto,
  errorDeTipo,
  LIMITES_TIPO,
  nombreNormalizado,
  normalizarTalla,
} from "@opai/domain";
import { z } from "zod";

import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto, reglaDeNegocio } from "../errores";
import {
  campoEntradaSchema,
  descripcionSchema,
  duplicado,
  ID_VISTA_PREVIA,
  nombreSchema,
  PERMISOS_INVENTARIO,
  prendaSchema,
  tallaSchema,
  tipoSchema,
  vistaTipo,
} from "./comun";
import { categoriasDeLaEmpresa, comportamientoDeCategoria, exigirCategoriaActiva } from "./categorias-kit";
import { exigirPrendaDelKit } from "./prendas";


export const tiposCrear = defineCapability({
  id: "inventario.tipos.crear",
  descripcion:
    "Crea un tipo de inventario de la empresa. Un «activo» (teléfono, radio) se controla por unidad y puede pedir campos propios como IMEI o número; una «ropa» (camisa, calzado) se controla por talla y puede apuntar a una prenda del uniforme.",
  permiso: PERMISOS_INVENTARIO.tiposManage,
  input: z.object({
    categoria: z.string().regex(CLAVE_CATEGORIA),
    nombre: nombreSchema,
    descripcion: descripcionSchema.optional(),
    campos: z.array(campoEntradaSchema).max(LIMITES_TIPO.campos).default([]),
    tallas: z.array(tallaSchema).max(LIMITES_TIPO.tallas).default([]),
    prendaClave: prendaSchema.optional(),
    entregaAPersona: z.boolean().optional().describe("Si el tipo se entrega a personas (uniforme, credencial, etc.)."),
  }),
  output: tipoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const cats = await categoriasDeLaEmpresa(ctx);
    await exigirCategoriaActiva(ctx, input.categoria);
    const comportamiento = await comportamientoDeCategoria(ctx, input.categoria);
    if (!comportamiento) throw reglaDeNegocio("La categoría no tiene un comportamiento válido.");
    const campos = camposConClave(input.campos.map((c) => ({ ...c, clave: undefined })));
    const tallas = input.tallas.map(normalizarTalla);
    const error = errorDeTipo({ comportamiento, campos, tallas });
    if (error) throw reglaDeNegocio(error);
    if (comportamiento === "activo" && input.prendaClave)
      throw reglaDeNegocio("La prenda del uniforme es solo para tipos de ropa.");
    if (input.prendaClave) await exigirPrendaDelKit(ctx, input.prendaClave);
    const normal = nombreNormalizado(input.nombre);
    if (await ctx.db.inventarioTipo.findFirst({ where: { nombreNormalizado: normal } }))
      throw conflicto(duplicado(input.nombre));
    const data = {
      categoria: input.categoria,
      nombre: input.nombre,
      nombreNormalizado: normal,
      descripcion: input.descripcion || null,
      campos,
      tallas,
      prendaClave: input.prendaClave ?? null,
      entregaAPersona: input.entregaAPersona ?? entregaAPersonaPorDefecto(comportamiento),
    };
    if (dryRun) return vistaTipo({ id: ID_VISTA_PREVIA, activo: true, ...data }, cats);
    const creado = await ctx.transaccion(async (tx) => {
      const t = await sinDuplicado(
        tx.inventarioTipo.create({ data: { ...data, tenantId: ctx.tenantId } }),
        duplicado(input.nombre),
      );
      await ctx.eventos.emitir(tx, {
        tipo: "inventario.tipo.creado",
        entidadTipo: "inventario_tipo",
        entidadId: t.id,
        payload: { nombre: t.nombre, categoria: t.categoria },
      });
      return t;
    });
    return vistaTipo(creado, cats);
  },
});

import { CATEGORIAS_TIPO, camposConClave, errorDeTipo, LIMITES_TIPO, nombreNormalizado } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import {
  campoEntradaSchema,
  camposGuardados,
  ID_VISTA_PREVIA,
  PERMISOS_INVENTARIO,
  tallaSchema,
  tipoSchema,
  vistaTipo,
} from "./comun";

const nombreSchema = z.string().trim().min(LIMITES_TIPO.nombreMin).max(LIMITES_TIPO.nombreMax);
const descripcionSchema = z.string().trim().max(LIMITES_TIPO.descripcionMax);
const prendaSchema = z.string().trim().regex(/^[a-z][a-z0-9_]{0,39}$/);
const duplicado = (nombre: string) => `Ya existe un tipo llamado «${nombre}».`;

export const tiposCrear = defineCapability({
  id: "inventario.tipos.crear",
  descripcion:
    "Crea un tipo de inventario de la empresa. Un «activo» (teléfono, radio) se controla por unidad y puede pedir campos propios como IMEI o número; una «ropa» (camisa, calzado) se controla por talla y puede apuntar a una prenda del uniforme.",
  permiso: PERMISOS_INVENTARIO.tiposManage,
  input: z.object({
    categoria: z.enum(CATEGORIAS_TIPO),
    nombre: nombreSchema,
    descripcion: descripcionSchema.optional(),
    campos: z.array(campoEntradaSchema).max(LIMITES_TIPO.campos).default([]),
    tallas: z.array(tallaSchema).max(LIMITES_TIPO.tallas).default([]),
    prendaClave: prendaSchema.optional(),
  }),
  output: tipoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const campos = camposConClave(input.campos.map((c) => ({ ...c, clave: undefined })));
    const error = errorDeTipo({ categoria: input.categoria, campos, tallas: input.tallas });
    if (error) throw reglaDeNegocio(error);
    if (input.categoria === "activo" && input.prendaClave)
      throw reglaDeNegocio("La prenda del uniforme es solo para tipos de ropa.");
    const normal = nombreNormalizado(input.nombre);
    if (await ctx.db.inventarioTipo.findFirst({ where: { nombreNormalizado: normal } }))
      throw conflicto(duplicado(input.nombre));
    const data = {
      categoria: input.categoria,
      nombre: input.nombre,
      nombreNormalizado: normal,
      descripcion: input.descripcion || null,
      campos,
      tallas: input.tallas,
      prendaClave: input.prendaClave ?? null,
    };
    if (dryRun) return vistaTipo({ id: ID_VISTA_PREVIA, activo: true, ...data });
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
    return vistaTipo(creado);
  },
});

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
    const existentes = new Set(camposGuardados(actual.campos).map((c) => c.clave));
    const desconocida = input.campos?.find((c) => c.clave && !existentes.has(c.clave));
    if (desconocida) throw reglaDeNegocio(`El campo «${desconocida.etiqueta}» no es de este tipo.`);
    const nombre = input.nombre ?? actual.nombre;
    const f = {
      ...actual,
      nombre,
      nombreNormalizado: nombreNormalizado(nombre),
      descripcion: input.descripcion !== undefined ? input.descripcion || null : actual.descripcion,
      campos: input.campos ? camposConClave(input.campos) : camposGuardados(actual.campos),
      tallas: input.tallas ?? actual.tallas,
      prendaClave: input.prendaClave !== undefined ? input.prendaClave : actual.prendaClave,
      activo: input.activo ?? actual.activo,
    };
    const categoria = actual.categoria === "ropa" ? "ropa" : "activo";
    const error = errorDeTipo({ categoria, campos: f.campos, tallas: f.tallas });
    if (error) throw reglaDeNegocio(error);
    if (categoria === "activo" && f.prendaClave)
      throw reglaDeNegocio("La prenda del uniforme es solo para tipos de ropa.");
    if (f.nombreNormalizado !== actual.nombreNormalizado) {
      const otro = await ctx.db.inventarioTipo.findFirst({
        where: { nombreNormalizado: f.nombreNormalizado, id: { not: actual.id } },
      });
      if (otro) throw conflicto(duplicado(nombre));
    }
    if (dryRun) return vistaTipo(f);
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

import { codigoNormalizado, LIMITES_ACTIVO, validarValores } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { activoSchema, vistaActivo } from "./activos-comun";
import { camposGuardados, ID_VISTA_PREVIA, PERMISOS_INVENTARIO } from "./comun";

const codigoSchema = z.string().trim().min(LIMITES_ACTIVO.codigoMin).max(LIMITES_ACTIVO.codigoMax);
const serieSchema = z.string().trim().max(LIMITES_ACTIVO.serieMax);
const notasSchema = z.string().trim().max(LIMITES_ACTIVO.notasMax);
const valoresEntrada = z
  .record(z.string(), z.union([z.string(), z.number(), z.null()]))
  .describe("Valores de los campos propios del tipo, por clave (ver inventario.tipos.get).");
const duplicado = (codigo: string) => `Ya existe un activo con el código «${codigo}».`;

/** Tipo activo de categoría «activo» de la empresa, o error de negocio. */
async function tipoDeActivo(ctx: Contexto, tipoId: string) {
  const tipo = await ctx.db.inventarioTipo.findFirst({ where: { id: tipoId } });
  if (!tipo) throw noEncontrado("El tipo de inventario");
  if (tipo.categoria !== "activo") throw reglaDeNegocio("La ropa se registra por existencias, no como activo.");
  return tipo;
}

async function exigirCodigoLibre(ctx: Contexto, codigo: string, salvo?: string) {
  const otro = await ctx.db.inventarioActivo.findFirst({
    where: { codigoNormalizado: codigoNormalizado(codigo), ...(salvo ? { id: { not: salvo } } : {}) },
    select: { id: true },
  });
  if (otro) throw conflicto(duplicado(codigo));
}

export const activosCrear = defineCapability({
  id: "inventario.activos.crear",
  descripcion:
    "Registra un activo nuevo de la empresa (un teléfono, una radio) con su tipo, un código interno único, el número de serie opcional y los valores de los campos propios de su tipo. Queda «Disponible».",
  permiso: PERMISOS_INVENTARIO.gestionar,
  input: z.object({
    tipoId: uuidSchema,
    codigo: codigoSchema,
    numeroSerie: serieSchema.optional(),
    valores: valoresEntrada.default({}),
    notas: notasSchema.optional(),
  }),
  output: activoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const tipo = await tipoDeActivo(ctx, input.tipoId);
    if (!tipo.activo) throw reglaDeNegocio("El tipo está desactivado: actívalo para registrar activos nuevos.");
    const v = validarValores(camposGuardados(tipo.campos), input.valores);
    if (!v.ok) throw reglaDeNegocio(v.error);
    await exigirCodigoLibre(ctx, input.codigo);
    const data = {
      tipoId: tipo.id,
      codigo: input.codigo,
      codigoNormalizado: codigoNormalizado(input.codigo),
      numeroSerie: input.numeroSerie || null,
      valores: v.valores,
      notas: input.notas || null,
    };
    const base = { estado: "disponible", bajaEn: null, motivoBaja: null };
    if (dryRun) return vistaActivo({ id: ID_VISTA_PREVIA, ...base, ...data }, tipo.nombre);
    const creado = await ctx.transaccion(async (tx) => {
      const a = await sinDuplicado(
        tx.inventarioActivo.create({ data: { ...data, tenantId: ctx.tenantId } }),
        duplicado(input.codigo),
      );
      await ctx.eventos.emitir(tx, {
        tipo: "inventario.activo.creado",
        entidadTipo: "inventario_activo",
        entidadId: a.id,
        payload: { codigo: a.codigo, tipoId: a.tipoId },
      });
      return a;
    });
    return vistaActivo(creado, tipo.nombre);
  },
});

export const activosActualizar = defineCapability({
  id: "inventario.activos.actualizar",
  descripcion:
    "Corrige los datos de un activo: código, número de serie, notas o los valores de los campos propios de su tipo. El tipo y el estado no cambian aquí; un activo dado de baja ya no se edita.",
  permiso: PERMISOS_INVENTARIO.gestionar,
  input: z.object({
    id: uuidSchema,
    codigo: codigoSchema.optional(),
    numeroSerie: serieSchema.nullable().optional(),
    valores: valoresEntrada.optional(),
    notas: notasSchema.nullable().optional(),
  }),
  output: activoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.inventarioActivo.findFirst({ where: { id: input.id } });
    if (!actual) throw noEncontrado("El activo");
    if (actual.estado === "de_baja") throw reglaDeNegocio("El activo está dado de baja: ya no se edita.");
    const tipo = await tipoDeActivo(ctx, actual.tipoId);
    let valores = actual.valores;
    if (input.valores) {
      const v = validarValores(camposGuardados(tipo.campos), input.valores);
      if (!v.ok) throw reglaDeNegocio(v.error);
      valores = v.valores;
    }
    if (input.codigo !== undefined) await exigirCodigoLibre(ctx, input.codigo, actual.id);
    const codigo = input.codigo ?? actual.codigo;
    const f = {
      ...actual,
      codigo,
      codigoNormalizado: codigoNormalizado(codigo),
      numeroSerie: input.numeroSerie !== undefined ? input.numeroSerie || null : actual.numeroSerie,
      notas: input.notas !== undefined ? input.notas || null : actual.notas,
      valores,
    };
    if (dryRun) return vistaActivo(f, tipo.nombre);
    const guardado = await ctx.transaccion(async (tx) => {
      const { codigo: c, codigoNormalizado: cn, numeroSerie, notas } = f;
      const data = { codigo: c, codigoNormalizado: cn, numeroSerie, notas, valores: f.valores ?? {} };
      const a = await sinDuplicado(tx.inventarioActivo.update({ where: { id: actual.id }, data }), duplicado(c));
      await ctx.eventos.emitir(tx, {
        tipo: "inventario.activo.actualizado",
        entidadTipo: "inventario_activo",
        entidadId: a.id,
        payload: { codigo: a.codigo },
      });
      return a;
    });
    return vistaActivo(guardado, tipo.nombre);
  },
});

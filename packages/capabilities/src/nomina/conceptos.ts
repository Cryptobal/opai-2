import { z } from "zod";

import { TIPOS_CONCEPTO } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { definidos, sinDuplicado } from "../core/maestros/comun";
import { PERMISO_CONFIG, PERMISO_READ } from "./comun";

const conceptoSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  nombre: z.string(),
  tipo: z.enum(TIPOS_CONCEPTO),
  imponible: z.boolean(),
  tributable: z.boolean(),
  codigoLre: z.string().nullable(),
  lreVerificado: z.boolean().describe("Siempre false hasta validar el código contra el suplemento del LRE."),
  orden: z.number().int(),
  activo: z.boolean(),
});

type Fila = z.output<typeof conceptoSchema>;
const vista = (c: Omit<Fila, "tipo"> & { tipo: string }): Fila => ({
  id: c.id,
  codigo: c.codigo,
  nombre: c.nombre,
  tipo: c.tipo as Fila["tipo"],
  imponible: c.imponible,
  tributable: c.tributable,
  codigoLre: c.codigoLre ?? null,
  lreVerificado: c.lreVerificado,
  orden: c.orden,
  activo: c.activo,
});

const campos = {
  nombre: z.string().trim().min(2).max(80),
  imponible: z.boolean(),
  tributable: z.boolean(),
  codigoLre: z.string().trim().max(10).nullable().describe("Código del suplemento del LRE; por verificar."),
  orden: z.number().int().min(0).max(999),
};

/** Lista los conceptos de haberes y descuentos con su tratamiento imponible y tributable. */
export const conceptosListar = defineCapability({
  id: "nomina.conceptos.listar",
  descripcion:
    "Lista los conceptos de haberes y descuentos de la empresa con su tratamiento (imponible, tributable) y el código del LRE, que siempre queda marcado por verificar hasta validarlo contra el suplemento oficial.",
  permiso: PERMISO_READ,
  input: z.object({ incluirInactivos: z.boolean().default(false) }),
  output: z.array(conceptoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.nominaConcepto.findMany({
      where: input.incluirInactivos ? {} : { activo: true },
      orderBy: [{ tipo: "asc" }, { orden: "asc" }, { codigo: "asc" }],
    });
    return filas.map(vista);
  },
});

/** Crea un concepto de haber o descuento. */
export const conceptosCrear = defineCapability({
  id: "nomina.conceptos.crear",
  descripcion:
    "Crea un concepto de haber o descuento con su código interno, nombre, tratamiento imponible y tributable y código LRE (por verificar). El código interno es único por empresa.",
  permiso: PERMISO_CONFIG,
  input: z.object({
    codigo: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{1,39}$/, "Minúsculas, números y _."),
    tipo: z.enum(TIPOS_CONCEPTO),
    ...campos,
    codigoLre: campos.codigoLre.default(null),
    orden: campos.orden.default(0),
  }),
  output: conceptoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const data = { ...input, lreVerificado: false, activo: true };
    if (dryRun) return vista({ ...data, id: "" });
    const c = await sinDuplicado(
      ctx.db.nominaConcepto.create({ data: { ...data, tenantId: ctx.tenantId } }),
      "Ya existe un concepto con ese código.",
    );
    return vista(c);
  },
});

/** Edita o desactiva un concepto (no se borra: las novedades pueden referenciarlo). */
export const conceptosActualizar = defineCapability({
  id: "nomina.conceptos.actualizar",
  descripcion:
    "Edita un concepto de haber o descuento: nombre, tratamiento imponible y tributable, código LRE (por verificar), orden, o lo desactiva. No cambia su código interno ni su tipo; las novedades ya cargadas lo conservan.",
  permiso: PERMISO_CONFIG,
  input: z.object({ id: uuidSchema, activo: z.boolean().optional() }).extend(
    Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v.optional()])) as {
      [K in keyof typeof campos]: z.ZodOptional<(typeof campos)[K]>;
    },
  ),
  output: conceptoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const c = await ctx.db.nominaConcepto.findUnique({ where: { id } });
    if (!c) throw noEncontrado("El concepto");
    const data = definidos({ ...cambios, ...(cambios.codigoLre !== undefined ? { lreVerificado: false } : {}) });
    if (dryRun) return vista({ ...c, ...data });
    return vista(await ctx.db.nominaConcepto.update({ where: { id }, data }));
  },
});

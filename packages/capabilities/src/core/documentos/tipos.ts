import { z } from "zod";

import { CAPAS_DOCUMENTO, MIMES_NUCLEO, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { definidos, otroQue, textoOpcional } from "../maestros/comun";

const tipoSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  capa: z.string(),
  obligatorio: z.boolean(),
  tieneVencimiento: z.boolean(),
  diasAlerta: z.number(),
  hitos: z.array(z.number()).describe("Días antes del vencimiento en que se avisa."),
  normativa: z.string().nullable(),
  mimesPermitidos: z.array(z.string()),
  visiblePortalDefault: z.array(z.string()),
  activo: z.boolean(),
});

type FilaTipo = Partial<z.input<typeof tipoSchema>> & {
  id: string;
  codigo: string;
  nombre: string;
  capa: string;
};
const vista = (t: FilaTipo) => ({
  id: t.id,
  codigo: t.codigo,
  nombre: t.nombre,
  descripcion: t.descripcion ?? null,
  capa: t.capa,
  obligatorio: t.obligatorio ?? false,
  tieneVencimiento: t.tieneVencimiento ?? false,
  diasAlerta: t.diasAlerta ?? 30,
  hitos: t.hitos ?? [30, 14, 7, 3, 1, 0],
  normativa: t.normativa ?? null,
  mimesPermitidos: t.mimesPermitidos ?? [],
  visiblePortalDefault: t.visiblePortalDefault ?? [],
  activo: t.activo ?? true,
});

const campos = {
  nombre: z.string().trim().min(2).max(120),
  descripcion: textoOpcional(500),
  obligatorio: z.boolean().optional(),
  tieneVencimiento: z.boolean().optional(),
  diasAlerta: z.number().int().min(0).max(365).optional(),
  hitos: z.array(z.number().int().min(0).max(365)).max(10).optional(),
  normativa: textoOpcional(200),
  mimesPermitidos: z.array(z.enum(MIMES_NUCLEO)).optional(),
  visiblePortalDefault: z
    .array(z.enum(["cliente", "trabajador", "supervisor", "terreno"]))
    .optional(),
  activo: z.boolean().optional(),
};

export const documentoTiposList = defineCapability({
  id: "core.documento_tipos.list",
  descripcion:
    "Tipos de documento de la empresa por capa (empresa, cuenta, instalación, persona, puesto): obligatorios, con vencimiento, avisos y formatos.",
  permiso: PERMISOS_CORE.documentosRead,
  portales: ["erp", "supervisor"],
  input: z.object({
    capa: z.enum(CAPAS_DOCUMENTO).optional(),
    incluirInactivos: z.boolean().default(false),
  }),
  output: z.array(tipoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.documentoTipo.findMany({
      where: {
        ...(input.capa ? { capa: input.capa } : {}),
        ...(input.incluirInactivos ? {} : { activo: true }),
      },
      orderBy: [{ capa: "asc" }, { orden: "asc" }, { nombre: "asc" }],
    });
    return filas.map(vista);
  },
});

export const documentoTiposCreate = defineCapability({
  id: "core.documento_tipos.create",
  descripcion:
    "Crea un tipo de documento propio de la empresa (código único) en una capa, con su regla de vencimiento y avisos.",
  permiso: PERMISOS_CORE.documentosManage,
  input: z.object({
    codigo: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_.-]{2,40}$/),
    capa: z.enum(CAPAS_DOCUMENTO),
    ...campos,
  }),
  output: tipoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (await ctx.db.documentoTipo.findFirst({ where: { codigo: input.codigo } }))
      throw conflicto(`Ya existe el tipo "${input.codigo}".`);
    const data = { activo: true, obligatorio: false, tieneVencimiento: false, ...definidos(input) };
    if (dryRun) return vista({ ...data, id: "" });
    return vista(await ctx.db.documentoTipo.create({ data: { ...data, tenantId: ctx.tenantId } }));
  },
});

export const documentoTiposUpdate = defineCapability({
  id: "core.documento_tipos.update",
  descripcion:
    "Actualiza un tipo de documento (nombre, obligatoriedad, vencimiento, avisos, formatos, visibilidad) o lo desactiva. Código y capa no cambian.",
  permiso: PERMISOS_CORE.documentosManage,
  input: z.object({ id: uuidSchema, ...z.object(campos).partial().shape }),
  output: tipoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...c }, { dryRun }) {
    const actual = await ctx.db.documentoTipo.findUnique({ where: { id } });
    if (!actual) throw noEncontrado("El tipo de documento");
    if (
      c.nombre &&
      (await ctx.db.documentoTipo.findFirst({
        where: { nombre: c.nombre, capa: actual.capa, ...otroQue(id) },
      }))
    ) {
      throw conflicto("Ya hay un tipo con ese nombre en la capa.");
    }
    const data = definidos(c);
    if (dryRun) return vista({ ...actual, ...data });
    return vista(await ctx.db.documentoTipo.update({ where: { id }, data }));
  },
});

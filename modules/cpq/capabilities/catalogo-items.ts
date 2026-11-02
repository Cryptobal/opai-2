import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { ensurePlantillaCatalogo } from "../persistencia/catalogo-seed";
import { itemSchema } from "./catalogo-esquemas";
import { uuidSchema } from "./esquemas";
import { PERMISO_MODELO, PERMISO_READ } from "./permisos";
import { ID_VISTA_PREVIA } from "./util";

export const catalogoItemsList = defineCapability({
  id: "cpq.catalogo_items.list",
  descripcion: "Lista los ítems del catálogo CPQ con costo unitario y recurrencia por defecto.",
  permiso: PERMISO_READ,
  input: z.object({ incluirInactivos: z.boolean().default(false) }),
  output: z.object({ items: z.array(itemSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await ensurePlantillaCatalogo(ctx);
    const items = await ctx.db.cpqCatalogoItem.findMany({
      where: input.incluirInactivos ? {} : { activo: true },
      orderBy: [{ codigo: "asc" }],
    });
    return {
      items: items.map((i) => ({
        ...i,
        recurrencia: i.recurrencia as "mensual" | "unico",
      })),
    };
  },
});

export const catalogoItemsCreate = defineCapability({
  id: "cpq.catalogo_items.create",
  descripcion: "Crea un ítem del catálogo CPQ con costo unitario, rateo y recurrencia por defecto.",
  permiso: PERMISO_MODELO,
  input: z.object({
    codigo: z.string().trim().min(1).max(40),
    nombre: z.string().trim().min(1).max(120),
    categoriaId: uuidSchema,
    grupo: z.enum(["item", "cargo", "uniforme", "insumo"]).default("item"),
    unidad: z.string().max(40).default("unidad"),
    modoCalculo: z.string().max(40).default("mensual_fijo"),
    rateoJson: z.string().max(500).default('{"tipo":"contrato"}'),
    costoUnitarioClp: z.number().int().min(0).default(0),
    recurrencia: z.enum(["mensual", "unico"]).default("mensual"),
    visibleCliente: z.boolean().default(true),
    porDefecto: z.boolean().default(false),
  }),
  output: itemSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const cat = await ctx.db.cpqCatalogoCategoria.findFirst({ where: { id: input.categoriaId } });
    if (!cat) throw noEncontrado("La categoría");
    if (dryRun) {
      return {
        id: ID_VISTA_PREVIA,
        ...input,
        activo: true,
      };
    }
    const fila = await ctx.db.cpqCatalogoItem.create({
      data: { tenantId: ctx.tenantId, ...input, activo: true },
    });
    return { ...fila, recurrencia: fila.recurrencia as "mensual" | "unico" };
  },
});

export const catalogoItemsUpdate = defineCapability({
  id: "cpq.catalogo_items.update",
  descripcion: "Edita costo, recurrencia u otros campos de un ítem del catálogo CPQ.",
  permiso: PERMISO_MODELO,
  input: z.object({
    id: uuidSchema,
    nombre: z.string().trim().min(1).max(120).optional(),
    categoriaId: uuidSchema.optional(),
    costoUnitarioClp: z.number().int().min(0).optional(),
    recurrencia: z.enum(["mensual", "unico"]).optional(),
    visibleCliente: z.boolean().optional(),
    porDefecto: z.boolean().optional(),
    rateoJson: z.string().max(500).optional(),
  }),
  output: itemSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.cpqCatalogoItem.findFirst({ where: { id: input.id } });
    if (!actual) throw noEncontrado("El ítem");
    if (input.categoriaId) {
      const cat = await ctx.db.cpqCatalogoCategoria.findFirst({ where: { id: input.categoriaId } });
      if (!cat) throw noEncontrado("La categoría");
    }
    const { id, ...cambios } = input;
    const data = Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined));
    if (dryRun) {
      return {
        ...actual,
        ...data,
        recurrencia: (data.recurrencia ?? actual.recurrencia) as "mensual" | "unico",
      };
    }
    const fila = await ctx.db.cpqCatalogoItem.update({ where: { id }, data });
    return { ...fila, recurrencia: fila.recurrencia as "mensual" | "unico" };
  },
});

export const catalogoItemsArchivar = defineCapability({
  id: "cpq.catalogo_items.archivar",
  descripcion: "Archiva un ítem del catálogo CPQ (queda inactivo, no se borra de líneas ya cotizadas).",
  permiso: PERMISO_MODELO,
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: uuidSchema, activo: z.literal(false) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.cpqCatalogoItem.findFirst({ where: { id: input.id } });
    if (!actual) throw noEncontrado("El ítem");
    if (dryRun) return { id: input.id, activo: false as const };
    await ctx.db.cpqCatalogoItem.update({ where: { id: input.id }, data: { activo: false } });
    return { id: input.id, activo: false as const };
  },
});

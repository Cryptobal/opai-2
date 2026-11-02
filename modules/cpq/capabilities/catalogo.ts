import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { ensurePlantillaCatalogo } from "../persistencia/catalogo-seed";
import { categoriaSchema } from "./catalogo-esquemas";
import { uuidSchema } from "./esquemas";
import { PERMISO_MODELO, PERMISO_READ } from "./permisos";
import { ID_VISTA_PREVIA } from "./util";

export const catalogoCategoriasList = defineCapability({
  id: "cpq.catalogo_categorias.list",
  descripcion: "Lista las categorías del catálogo CPQ del tenant (R55).",
  permiso: PERMISO_READ,
  input: z.object({ incluirInactivas: z.boolean().default(false) }),
  output: z.object({ items: z.array(categoriaSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await ensurePlantillaCatalogo(ctx);
    const items = await ctx.db.cpqCatalogoCategoria.findMany({
      where: input.incluirInactivas ? {} : { activa: true },
      orderBy: [{ orden: "asc" }, { clave: "asc" }],
    });
    return { items: items.map((c) => ({ ...c, clase: c.clase as "directo" | "indirecto" })) };
  },
});

export const catalogoCategoriasCreate = defineCapability({
  id: "cpq.catalogo_categorias.create",
  descripcion: "Crea una categoría del catálogo CPQ (directo o indirecto) con clave única por tenant.",
  permiso: PERMISO_MODELO,
  input: z.object({
    clave: z.string().trim().min(1).max(40),
    nombre: z.string().trim().min(1).max(120),
    clase: z.enum(["directo", "indirecto"]).default("directo"),
    orden: z.number().int().min(0).max(999).optional(),
  }),
  output: categoriaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (dryRun) {
      return {
        id: ID_VISTA_PREVIA,
        clave: input.clave,
        nombre: input.nombre,
        clase: input.clase,
        activa: true,
        orden: input.orden ?? 0,
      };
    }
    const fila = await ctx.db.cpqCatalogoCategoria.create({
      data: {
        tenantId: ctx.tenantId,
        clave: input.clave,
        nombre: input.nombre,
        clase: input.clase,
        orden: input.orden ?? 0,
      },
    });
    return { ...fila, clase: fila.clase as "directo" | "indirecto" };
  },
});

export const catalogoCategoriasUpdate = defineCapability({
  id: "cpq.catalogo_categorias.update",
  descripcion: "Edita nombre, clase u orden de una categoría del catálogo CPQ del tenant.",
  permiso: PERMISO_MODELO,
  input: z.object({
    id: uuidSchema,
    nombre: z.string().trim().min(1).max(120).optional(),
    clase: z.enum(["directo", "indirecto"]).optional(),
    orden: z.number().int().min(0).max(999).optional(),
  }),
  output: categoriaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.cpqCatalogoCategoria.findFirst({ where: { id: input.id } });
    if (!actual) throw noEncontrado("La categoría");
    const { id, ...cambios } = input;
    const data = Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined));
    if (dryRun) return { ...actual, ...data, clase: (data.clase ?? actual.clase) as "directo" | "indirecto" };
    const fila = await ctx.db.cpqCatalogoCategoria.update({ where: { id }, data });
    return { ...fila, clase: fila.clase as "directo" | "indirecto" };
  },
});

export const catalogoCategoriasDesactivar = defineCapability({
  id: "cpq.catalogo_categorias.desactivar",
  descripcion: "Desactiva una categoría del catálogo (no se elimina si tiene ítems).",
  permiso: PERMISO_MODELO,
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: uuidSchema, activa: z.literal(false) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.cpqCatalogoCategoria.findFirst({ where: { id: input.id } });
    if (!actual) throw noEncontrado("La categoría");
    if (dryRun) return { id: input.id, activa: false as const };
    await ctx.db.cpqCatalogoCategoria.update({ where: { id: input.id }, data: { activa: false } });
    return { id: input.id, activa: false as const };
  },
});

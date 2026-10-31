// Catálogo de etiquetas del tenant (CAR-26). Crear, renombrar y borrar es de owner y admin.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import type { Contexto } from "../../types";
import { sinDuplicado } from "../maestros/comun";
import { TONOS_ETIQUETA } from "./comun";

export const etiquetaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  tono: z.enum(TONOS_ETIQUETA),
  activa: z.boolean(),
});

const nombre = z.string().trim().min(1).max(40);
const vista = (e: { id: string; nombre: string; tono: string; activa: boolean }) => ({
  id: e.id,
  nombre: e.nombre,
  tono: e.tono as (typeof TONOS_ETIQUETA)[number],
  activa: e.activa,
});

async function nombreLibre(ctx: Contexto, n: string, excepto?: string) {
  const otra = await ctx.db.etiqueta.findFirst({
    where: {
      nombre: { equals: n, mode: "insensitive" },
      ...(excepto ? { id: { not: excepto } } : {}),
    },
  });
  if (otra) throw conflicto("Ya existe una etiqueta con ese nombre.");
}

export async function etiquetaDe(ctx: Contexto, id: string) {
  const e = await ctx.db.etiqueta.findFirst({ where: { id } });
  if (!e) throw noEncontrado("La etiqueta");
  return e;
}

export const etiquetasList = defineCapability({
  auditarLectura: (s) => s.map((e) => e.id),
  id: "core.etiquetas.list",
  descripcion: "Catálogo de etiquetas de la empresa (activas por defecto), ordenado por nombre.",
  permiso: PERMISOS_CORE.etiquetasRead,
  portales: ["erp"],
  input: z.object({ incluirInactivas: z.boolean().default(false) }),
  output: z.array(etiquetaSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.etiqueta.findMany({
      where: input.incluirInactivas ? {} : { activa: true },
      orderBy: { nombre: "asc" },
    });
    return filas.map(vista);
  },
});

export const etiquetasCreate = defineCapability({
  id: "core.etiquetas.create",
  descripcion:
    "Crea una etiqueta del catálogo de la empresa (nombre único, sin distinguir mayúsculas) con un tono del sistema de diseño.",
  permiso: PERMISOS_CORE.etiquetasConfig,
  input: z.object({ nombre, tono: z.enum(TONOS_ETIQUETA).default("neutral") }),
  output: etiquetaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await nombreLibre(ctx, input.nombre);
    if (dryRun) return vista({ id: "", activa: true, ...input });
    const e = await ctx.transaccion(async (tx) => {
      const nueva = await sinDuplicado(
        tx.etiqueta.create({ data: { tenantId: ctx.tenantId, activa: true, ...input } }),
        "Ya existe una etiqueta con ese nombre.",
      );
      await ctx.eventos.emitir(tx, {
        tipo: "core.etiqueta.creada",
        entidadTipo: "etiqueta",
        entidadId: nueva.id,
        payload: {},
      });
      return nueva;
    });
    return vista(e);
  },
});

export const etiquetasUpdate = defineCapability({
  id: "core.etiquetas.update",
  descripcion:
    "Renombra una etiqueta, cambia su tono o la desactiva (deja de poder asignarse). Solo cambia lo enviado.",
  permiso: PERMISOS_CORE.etiquetasConfig,
  input: z.object({
    id: uuidSchema,
    nombre: nombre.optional(),
    tono: z.enum(TONOS_ETIQUETA).optional(),
    activa: z.boolean().optional(),
  }),
  output: etiquetaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await etiquetaDe(ctx, id);
    if (cambios.nombre) await nombreLibre(ctx, cambios.nombre, id);
    const data = Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined));
    if (dryRun) return vista({ ...actual, ...data });
    const e = await ctx.transaccion(async (tx) => {
      const r = await sinDuplicado(
        tx.etiqueta.update({ where: { id }, data }),
        "Ya existe una etiqueta con ese nombre.",
      );
      await ctx.eventos.emitir(tx, {
        tipo: "core.etiqueta.actualizada",
        entidadTipo: "etiqueta",
        entidadId: id,
        payload: {},
      });
      return r;
    });
    return vista(e);
  },
});

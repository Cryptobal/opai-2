import { z } from "zod";

import { defineCapability } from "@opai/capabilities";
import type { Prisma } from "@opai/db";

import { PERMISO_BANCOS_GESTIONAR, PERMISO_BANCOS_VER } from "./permisos";

const reglaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  prioridad: z.number().int(),
  modo: z.enum(["todas", "alguna"]),
  condiciones: z.record(z.string(), z.unknown()),
  activa: z.boolean(),
});

export const bancosReglasListar = defineCapability({
  id: "finanzas.reglas_banco.listar",
  descripcion: "Lista las reglas de conciliación bancaria del tenant ordenadas por prioridad.",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({}),
  output: z.object({ items: z.array(reglaSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const items = await ctx.db.reglaConciliacion.findMany({ orderBy: [{ prioridad: "desc" }, { nombre: "asc" }] });
    return {
      items: items.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        prioridad: r.prioridad,
        modo: r.modo as "todas" | "alguna",
        condiciones: r.condiciones as Record<string, unknown>,
        activa: r.activa,
      })),
    };
  },
});

export const bancosReglasGuardar = defineCapability({
  id: "finanzas.reglas_banco.guardar",
  descripcion: "Crea o actualiza una regla de conciliación bancaria con condiciones por RUT, glosa, monto o referencia.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: z.object({
    id: z.uuid().optional(),
    nombre: z.string().trim().min(2).max(120),
    prioridad: z.number().int().min(0).max(1000).default(0),
    modo: z.enum(["todas", "alguna"]).default("todas"),
    condiciones: z.record(z.string(), z.unknown()),
    activa: z.boolean().default(true),
  }),
  output: reglaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (dryRun) {
      return {
        id: input.id ?? "00000000-0000-0000-0000-000000000002",
        nombre: input.nombre,
        prioridad: input.prioridad,
        modo: input.modo,
        condiciones: input.condiciones,
        activa: input.activa,
      };
    }
    const data = {
      nombre: input.nombre,
      prioridad: input.prioridad,
      modo: input.modo,
      condiciones: input.condiciones as Prisma.InputJsonValue,
      activa: input.activa,
    };
    const row = input.id
      ? await ctx.db.reglaConciliacion.update({ where: { id: input.id }, data })
      : await ctx.db.reglaConciliacion.create({ data: { ...data, tenantId: ctx.tenantId } });
    return {
      id: row.id,
      nombre: row.nombre,
      prioridad: row.prioridad,
      modo: row.modo as "todas" | "alguna",
      condiciones: row.condiciones as Record<string, unknown>,
      activa: row.activa,
    };
  },
});

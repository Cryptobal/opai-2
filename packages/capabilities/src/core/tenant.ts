import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { tenantActual } from "./comun";
import { tenantSchema, timezoneSchema } from "./esquemas";

export const tenantGet = defineCapability({
  id: "core.tenant.get",
  descripcion: "Datos de la empresa actual: nombre, slug, vertical, zona horaria y estado.",
  permiso: PERMISOS_CORE.tenantRead,
  input: z.object({}),
  output: tenantSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx) => tenantActual(ctx),
});

export const tenantUpdate = defineCapability({
  id: "core.tenant.update",
  descripcion:
    "Cambia nombre o zona horaria de la empresa actual. La vertical solo la cambia plataforma.",
  permiso: PERMISOS_CORE.tenantManage,
  input: z
    .object({
      nombre: z.string().trim().min(2).max(120).optional(),
      timezone: timezoneSchema.optional(),
    })
    .refine((v) => v.nombre !== undefined || v.timezone !== undefined, "Nada que cambiar."),
  output: tenantSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await tenantActual(ctx);
    const data = {
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
    };
    if (dryRun) return { ...actual, ...data };
    return ctx.db.tenant.update({ where: { id: actual.id }, data });
  },
});

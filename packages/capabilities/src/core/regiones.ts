import { z } from "zod";

import { PERMISOS_CORE, REGIONES_CHILE } from "@opai/domain";

import { defineCapability } from "../define";

const regionSchema = z.object({ nombre: z.string() });

export const regionesList = defineCapability({
  id: "core.regiones.list",
  descripcion: "Catálogo de las 16 regiones administrativas de Chile, para filtros y formularios.",
  permiso: PERMISOS_CORE.tenantRead,
  portales: ["erp", "supervisor"],
  input: z.object({
    cursor: z.string().max(80).optional(),
    limite: z.number().int().min(1).max(200).default(200),
  }),
  output: z.object({
    items: z.array(regionSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  sinDb: true,
  handler: async (_ctx, input) => {
    const todos = REGIONES_CHILE.filter((n) => !input.cursor || n > input.cursor).map((nombre) => ({
      nombre,
    }));
    const items = todos.slice(0, input.limite);
    return { items, siguiente: todos.length > input.limite ? (items.at(-1)?.nombre ?? null) : null };
  },
});
import { z } from "zod";

import { PERMISOS_CORE, REGIONES_CHILE } from "@opai/domain";

import { defineCapability } from "../define";

export const regionesList = defineCapability({
  id: "core.regiones.list",
  descripcion: "Catálogo de las 16 regiones administrativas de Chile, para filtros y formularios.",
  permiso: PERMISOS_CORE.tenantRead,
  portales: ["erp", "supervisor"],
  input: z.object({}),
  output: z.object({
    items: z.array(z.object({ nombre: z.string() })),
  }),
  efecto: "lectura",
  dryRun: false,
  sinDb: true,
  handler: async () => ({
    items: REGIONES_CHILE.map((nombre) => ({ nombre })),
  }),
});
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { prohibido } from "../errores";
import { aMiembro, INCLUIR_MIEMBRO, miembroSchema, ultimosAccesos } from "./users-miembro";

export const usersList = defineCapability({
  auditarLectura: (s) => s.map((m) => m.userId),
  id: "core.users.list",
  descripcion: "Usuarios de la empresa actual con rol base, rol personalizado, portales, estado y cuántas excepciones de permiso tienen.",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({}),
  output: z.array(miembroSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    if (ctx.alcance) throw prohibido("No tienes acceso al directorio de usuarios.");
    const filas = await ctx.db.membership.findMany({
      include: INCLUIR_MIEMBRO,
      orderBy: { createdAt: "asc" },
    });
    const accesos = await ultimosAccesos(
      ctx,
      filas.map((m) => m.userId),
    );
    return filas.map((m) => aMiembro(m, accesos.get(m.userId) ?? null));
  },
});

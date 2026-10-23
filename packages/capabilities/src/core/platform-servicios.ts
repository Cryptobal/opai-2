import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { iso, requierePlataforma } from "./comun";
import { uuidSchema } from "./esquemas";

const trabajoSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  estado: z.string(),
  intentos: z.number(),
  programadoPara: z.string().nullable(),
  ultimoError: z.string().nullable(),
});

export const platformTrabajosList = defineCapability({
  id: "platform.trabajos.list",
  descripcion:
    "Plataforma: cola de trabajos de una empresa (pendientes, en curso, fallidos), más reciente primero, con su último error.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema,
    estado: z.enum(["pendiente", "en_curso", "hecho", "fallido", "cancelado"]).optional(),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.array(trabajoSchema),
  efecto: "lectura",
  dryRun: false,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input) {
    const db = requierePlataforma(ctx).paraTenant(input.tenantId);
    const filas = await db.trabajo.findMany({
      where: input.estado ? { estado: input.estado } : {},
      orderBy: { createdAt: "desc" },
      take: input.limite,
    });
    return filas.map((t) => ({ ...t, programadoPara: iso(t.programadoPara) }));
  },
});

async function trabajoDe(
  ctx: Parameters<typeof requierePlataforma>[0],
  tenantId: string,
  id: string,
) {
  const t = await requierePlataforma(ctx)
    .paraTenant(tenantId)
    .trabajo.findUnique({ where: { id } });
  if (!t) throw noEncontrado("El trabajo");
  return t;
}

export const platformTrabajosReintentar = defineCapability({
  id: "platform.trabajos.reintentar",
  descripcion:
    "Plataforma: vuelve a poner en cola un trabajo fallido o cancelado de una empresa, con los intentos en cero.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema, trabajoId: uuidSchema }),
  output: trabajoSchema,
  efecto: "escritura",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input, { dryRun }) {
    const t = await trabajoDe(ctx, input.tenantId, input.trabajoId);
    if (!["fallido", "cancelado"].includes(t.estado)) {
      throw reglaDeNegocio("Solo se reintentan trabajos fallidos o cancelados.");
    }
    const data = {
      estado: "pendiente",
      intentos: 0,
      programadoPara: new Date(),
      ultimoError: null,
    };
    const r = dryRun
      ? { ...t, ...data }
      : await requierePlataforma(ctx)
          .paraTenant(input.tenantId)
          .trabajo.update({ where: { id: t.id }, data });
    return { ...r, programadoPara: iso(r.programadoPara) };
  },
});

export const platformTrabajosCancelar = defineCapability({
  id: "platform.trabajos.cancelar",
  descripcion: "Plataforma: cancela un trabajo pendiente de una empresa. No se ejecutará.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema, trabajoId: uuidSchema }),
  output: trabajoSchema,
  efecto: "irreversible",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input, { dryRun }) {
    const t = await trabajoDe(ctx, input.tenantId, input.trabajoId);
    if (t.estado !== "pendiente") throw reglaDeNegocio("Solo se cancelan trabajos pendientes.");
    const r = dryRun
      ? { ...t, estado: "cancelado" }
      : await requierePlataforma(ctx)
          .paraTenant(input.tenantId)
          .trabajo.update({ where: { id: t.id }, data: { estado: "cancelado" } });
    return { ...r, programadoPara: iso(r.programadoPara) };
  },
});

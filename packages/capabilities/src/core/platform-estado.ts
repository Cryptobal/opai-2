import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { requierePlataforma } from "./comun";
import { tenantSchema, timezoneSchema, uuidSchema, verticalSchema } from "./esquemas";

const objetivo = { tenantObjetivo: (input: { tenantId: string }) => input.tenantId };

export const platformTenantsUpdate = defineCapability({
  id: "platform.tenants.update",
  descripcion: "Plataforma: cambia nombre, vertical o zona horaria de una empresa.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema,
    nombre: z.string().trim().min(2).max(120).optional(),
    vertical: verticalSchema.optional(),
    timezone: timezoneSchema.optional(),
  }),
  output: tenantSchema,
  efecto: "escritura",
  dryRun: true,
  ...objetivo,
  async handler(ctx, { tenantId, ...cambios }, { dryRun }) {
    const p = requierePlataforma(ctx);
    const actual = await p.globales.tenant.findUnique({ where: { id: tenantId } });
    if (!actual) throw noEncontrado("La empresa");
    const data = Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined));
    if (dryRun) return { ...actual, ...data };
    return p.globales.tenant.update({ where: { id: tenantId }, data });
  },
});

export const platformTenantsSetEstado = defineCapability({
  id: "platform.tenants.set_estado",
  descripcion:
    "Plataforma: pone una empresa en trial, activa o suspendida. Suspender bloquea el ingreso de sus miembros.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema, estado: z.enum(["trial", "activo", "suspendido"]) }),
  output: tenantSchema,
  efecto: "irreversible",
  dryRun: true,
  ...objetivo,
  async handler(ctx, input, { dryRun }) {
    const p = requierePlataforma(ctx);
    const actual = await p.globales.tenant.findUnique({ where: { id: input.tenantId } });
    if (!actual) throw noEncontrado("La empresa");
    if (dryRun) return { ...actual, estado: input.estado };
    return p.globales.tenant.update({
      where: { id: input.tenantId },
      data: { estado: input.estado },
    });
  },
});

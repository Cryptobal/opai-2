import { z } from "zod";

import {
  PERMISOS_CORE,
  PERMISOS_PLATAFORMA,
  permisosDe,
  tienePermisoPlataforma,
} from "@opai/domain";

import { defineCapability } from "../define";
import { listarModulos } from "../module";
import { tenantSchema } from "./esquemas";

/** Catálogo de permisos conocidos: núcleo + módulos registrados. */
export function catalogoPermisos(): string[] {
  return [
    ...Object.values(PERMISOS_CORE),
    ...listarModulos().flatMap((m) => m.permisos.map((p) => p.id)),
  ];
}

export const me = defineCapability({
  id: "core.me",
  descripcion:
    "Quién soy: usuario, actor (usuario o agente vía usuario), empresa actual, rol, portales, permisos efectivos y módulos activos.",
  permiso: null,
  sinTenant: true,
  input: z.object({}),
  output: z.object({
    usuario: z
      .object({
        id: z.string(),
        nombre: z.string(),
        email: z.string(),
        platformRole: z.string().nullable(),
      })
      .nullable(),
    actor: z.object({
      tipo: z.string(),
      id: z.string().nullable(),
      viaUserId: z.string().nullable(),
    }),
    tenant: tenantSchema.nullable(),
    rol: z.string().nullable(),
    portales: z.array(z.string()),
    permisos: z.array(z.string()),
    modulosActivos: z.array(z.string()),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const tenant = ctx.conTenant
      ? await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId } })
      : null;
    const membresia =
      tenant && ctx.usuario
        ? await ctx.db.membership.findUnique({
            where: { tenantId_userId: { tenantId: tenant.id, userId: ctx.usuario.id } },
          })
        : null;
    const deTenant = ctx.rol ? permisosDe(ctx.rol, catalogoPermisos(), ctx.modulosActivos) : [];
    const dePlataforma = Object.values(PERMISOS_PLATAFORMA).filter(
      (p) => ctx.actor.tipo === "user" && tienePermisoPlataforma(ctx.usuario?.platformRole, p),
    );
    return {
      usuario: ctx.usuario,
      actor: {
        tipo: ctx.actor.tipo,
        id: ctx.actor.id ?? null,
        viaUserId: ctx.actor.viaUserId ?? null,
      },
      tenant,
      rol: ctx.rol,
      portales: membresia?.portales ?? [],
      permisos: [...deTenant, ...dePlataforma],
      modulosActivos: [...ctx.modulosActivos],
    };
  },
});

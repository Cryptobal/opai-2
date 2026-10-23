import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { iso, requierePlataforma } from "./comun";
import { modulosConEstado, moduloEstadoSchema, resumenUso, usoSchema } from "./consultas";
import { tenantSchema, uuidSchema } from "./esquemas";
import { estadoInvitacion } from "./invitar";

export const platformTenantsGet = defineCapability({
  id: "platform.tenants.get",
  descripcion:
    "Plataforma: detalle de una empresa (datos, módulos, administradores, invitaciones, API keys y uso de 30 días).",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema }),
  output: z.object({
    tenant: tenantSchema,
    modulos: z.array(moduloEstadoSchema),
    administradores: z.array(
      z.object({
        membershipId: z.string(),
        nombre: z.string(),
        email: z.string(),
        rol: z.string(),
        estado: z.string(),
      }),
    ),
    invitaciones: z.array(
      z.object({ id: z.string(), email: z.string(), rol: z.string(), estado: z.string() }),
    ),
    apiKeys: z.array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        prefijo: z.string(),
        scopes: z.array(z.string()),
        ultimoUsoEn: z.string().nullable(),
        revocadaEn: z.string().nullable(),
      }),
    ),
    uso: usoSchema,
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const p = requierePlataforma(ctx);
    const tenant = await p.globales.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw noEncontrado("La empresa");
    const db = p.paraTenant(tenant.id);
    const [modulos, admins, invitaciones, keys, uso] = await Promise.all([
      modulosConEstado(db),
      db.membership.findMany({
        where: { rol: { in: ["owner", "admin"] } },
        include: { user: true },
      }),
      db.invitation.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      db.apiKey.findMany({ orderBy: { createdAt: "desc" } }),
      resumenUso(db, 30),
    ]);
    return {
      tenant,
      modulos,
      administradores: admins.map((m) => ({
        membershipId: m.id,
        nombre: m.user.name,
        email: m.user.email,
        rol: m.rol,
        estado: m.estado,
      })),
      invitaciones: invitaciones
        .map((i) => ({ id: i.id, email: i.email, rol: i.rol, estado: estadoInvitacion(i) }))
        .filter((i) => i.estado === "pendiente"),
      apiKeys: keys.map((k) => ({
        ...k,
        ultimoUsoEn: iso(k.ultimoUsoEn),
        revocadaEn: iso(k.revocadaEn),
      })),
      uso,
    };
  },
});

export const platformUsageSummary = defineCapability({
  id: "platform.usage.summary",
  descripcion: "Plataforma: ejecuciones por empresa en los últimos días.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({ dias: z.number().int().min(1).max(365).default(30) }),
  output: z.array(
    z.object({
      tenantId: z.string(),
      slug: z.string(),
      nombre: z.string(),
      total: z.number(),
      errores: z.number(),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const p = requierePlataforma(ctx);
    const tenants = await p.globales.tenant.findMany({ orderBy: { nombre: "asc" } });
    return Promise.all(
      tenants.map(async (t) => {
        const uso = await resumenUso(p.paraTenant(t.id), input.dias);
        return {
          tenantId: t.id,
          slug: t.slug,
          nombre: t.nombre,
          total: uso.total,
          errores: uso.errores,
        };
      }),
    );
  },
});

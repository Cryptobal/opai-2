import { z } from "zod";

import { sembrarCatalogo } from "@opai/db";
import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { conflicto } from "../errores";
import type { Contexto } from "../types";
import { requierePlataforma, usuarioResponsable } from "./comun";
import { emailSchema, slugSchema, timezoneSchema, verticalSchema } from "./esquemas";
import { invitacionCreadaSchema } from "./invitations";
import { crearInvitacion } from "./invitar";

/** Invita al primer owner/admin salvo que ya sea miembro (adopción de un tenant existente). */
export async function invitarAdministrador(
  ctx: Contexto,
  tenant: { id: string; slug: string; nombre: string },
  email: string,
  rol: "owner" | "admin",
  dryRun: boolean,
) {
  const db = requierePlataforma(ctx).paraTenant(tenant.id);
  const invitadoPor = { id: usuarioResponsable(ctx), nombre: ctx.usuario?.nombre ?? "OPAI" };
  return crearInvitacion(
    db,
    tenant,
    { email, rol, portales: ["erp"], invitadoPor },
    ctx.servicios,
    dryRun,
  );
}

export const platformTenantsCreate = defineCapability({
  id: "platform.tenants.create",
  descripcion:
    "Plataforma: crea una empresa (trial, con el núcleo activo) e invita a su primer owner. Si el slug existe, error salvo `adoptarExistente`.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({
    slug: slugSchema,
    nombre: z.string().trim().min(2).max(120),
    vertical: verticalSchema,
    timezone: timezoneSchema.default("America/Santiago"),
    adminEmail: emailSchema,
    adoptarExistente: z.boolean().default(false),
  }),
  output: z.object({
    tenantId: z.string().nullable(),
    slug: z.string(),
    adoptado: z.boolean(),
    invitacion: invitacionCreadaSchema.nullable(),
  }),
  efecto: "escritura",
  dryRun: true,
  tenantObjetivo: (_input, output) => output?.tenantId ?? undefined,
  async handler(ctx, input, { dryRun }) {
    const p = requierePlataforma(ctx);
    const existente = await p.globales.tenant.findUnique({ where: { slug: input.slug } });
    if (existente && !input.adoptarExistente) {
      throw conflicto(
        `Ya existe la empresa "${existente.nombre}" con el slug "${input.slug}". Puedes usar la existente.`,
      );
    }
    if (dryRun) {
      const tenant = existente ?? { id: "", slug: input.slug, nombre: input.nombre };
      const invitacion = existente
        ? await invitarAdministrador(ctx, tenant, input.adminEmail, "owner", true).catch(() => null)
        : null;
      return {
        tenantId: existente?.id ?? null,
        slug: input.slug,
        adoptado: Boolean(existente),
        invitacion,
      };
    }
    const tenant =
      existente ??
      (await p.globales.tenant.create({
        data: {
          slug: input.slug,
          nombre: input.nombre,
          vertical: input.vertical,
          timezone: input.timezone,
          estado: "trial",
        },
      }));
    // Catálogo base de la vertical (cargos con estructura, tipos de documento). Idempotente.
    await sembrarCatalogo(p.paraTenant(tenant.id), tenant.id, input.vertical);
    await p.paraTenant(tenant.id).tenantModule.upsert({
      where: { tenantId_moduloId: { tenantId: tenant.id, moduloId: "core" } },
      update: { estado: "activo" },
      create: { tenantId: tenant.id, moduloId: "core", estado: "activo" },
    });
    const invitacion = await invitarAdministrador(
      ctx,
      tenant,
      input.adminEmail,
      "owner",
      false,
    ).catch((e: unknown) => {
      // Al adoptar, el administrador puede ya ser miembro: no es un error.
      if (existente && e instanceof Error && /ya pertenece/.test(e.message)) return null;
      throw e;
    });
    return { tenantId: tenant.id, slug: tenant.slug, adoptado: Boolean(existente), invitacion };
  },
});

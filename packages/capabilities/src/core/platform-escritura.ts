import { z } from "zod";

import { esRutRepetido } from "@opai/db";
import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { conflicto, noEncontrado } from "../errores";
import type { Contexto } from "../types";
import { requierePlataforma, usuarioResponsable } from "./comun";
import { emailSchema, slugSchema, timezoneSchema, verticalSchema } from "./esquemas";
import { invitacionCreadaSchema } from "./invitations";
import {
  MENSAJE_RUT_REPETIDO,
  platformTenantsPerfilGet,
  platformTenantsPerfilSet,
  razonSocialSchema,
} from "./platform-perfil";
import { rutSchema } from "./maestros/comun";

/** Invita al primer owner/admin salvo que ya sea miembro (adopción de un tenant existente). */
export async function invitarAdministrador(
  ctx: Contexto,
  tenant: { id: string; slug: string; nombre: string },
  email: string,
  rol: "owner" | "admin",
  dryRun: boolean,
) {
  const invitadoPor = { id: usuarioResponsable(ctx), nombre: ctx.usuario?.nombre ?? "OPAI" };
  return requierePlataforma(ctx)
    .empresa(tenant.id)
    .invitar(tenant, { email, rol, portales: ["erp"], invitadoPor }, ctx.servicios, dryRun);
}

export const platformTenantsCreate = defineCapability({
  id: "platform.tenants.create",
  descripcion:
    "Plataforma: crea una empresa (trial, con el núcleo activo) con su razón social y RUT tributario, e invita a su primer owner. Si el slug existe, error salvo `adoptarExistente`. El RUT se valida y no puede repetirse en otra empresa (la vista previa no detecta repetidos).",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({
    slug: slugSchema,
    nombre: z.string().trim().min(2).max(120),
    vertical: verticalSchema,
    razonSocial: razonSocialSchema,
    rut: rutSchema,
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
  // Irreversible (ADR-055): invita a un owner (también al adoptar una empresa existente), igual que
  // platform.admins.invite; un agente con key de plataforma queda en aprobación humana.
  efecto: "irreversible",
  dryRun: true,
  tenantObjetivo: (_input, output) => output?.tenantId ?? undefined,
  async handler(ctx, input, { dryRun }) {
    const p = requierePlataforma(ctx);
    const existente = await p.globales.tenantPorSlug(input.slug);
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
    const datos = { rut: input.rut, razonSocial: input.razonSocial };
    const repetido = (e: unknown) => {
      throw esRutRepetido(e) ? conflicto(MENSAJE_RUT_REPETIDO) : e;
    };
    let tenant = existente;
    if (existente) {
      const actual = await p.empresa(existente.id).perfilTributario();
      if (actual?.rut && actual.rut !== input.rut)
        throw conflicto("La empresa ya tiene otro RUT; corrígelo desde su ficha.");
      await p.empresa(existente.id).fijarPerfilTributario(datos).catch(repetido);
    } else {
      tenant = await p.globales
        .crearTenantConPerfil(
          {
            slug: input.slug,
            nombre: input.nombre,
            vertical: input.vertical,
            timezone: input.timezone,
            estado: "trial",
          },
          datos,
        )
        .catch(repetido);
    }
    if (!tenant) throw noEncontrado("La empresa");
    // Catálogo base de la vertical (cargos con estructura, tipos de documento). Idempotente.
    const empresa = p.empresa(tenant.id);
    await empresa.sembrarCatalogo(input.vertical);
    await empresa.fijarModulo("core", "activo");
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

/** Escrituras de plataforma sobre la empresa misma: crearla y sus datos tributarios. */
export const capacidadesTenantsEscritura = [
  platformTenantsCreate,
  platformTenantsPerfilGet,
  platformTenantsPerfilSet,
];

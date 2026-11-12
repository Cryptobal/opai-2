// Miembros e invitaciones de una empresa desde Plataforma (CAR-323, hoja de Plataforma §3 y §4): la
// pestaña Usuarios de la ficha ve a todos los miembros y gestiona las invitaciones pendientes.
import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../define";
import type { Contexto } from "../../types";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { iso, requierePlataforma, usuarioResponsable } from "../comun";
import { rolSchema, uuidSchema } from "../esquemas";
import { estadoInvitacion } from "../invitar";

const objetivo = { tenantObjetivo: (input: { tenantId: string }) => input.tenantId };

export const platformTenantsMiembros = defineCapability({
  id: "platform.tenants.miembros",
  descripcion:
    "Plataforma: todos los miembros de una empresa (no solo owners y admins) con su rol, portales y estado, y sus invitaciones pendientes.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema }),
  output: z.object({
    miembros: z.array(
      z.object({
        membershipId: z.string(),
        nombre: z.string(),
        email: z.string(),
        rol: z.string(),
        portales: z.array(z.string()),
        estado: z.string(),
        desde: z.string(),
      }),
    ),
    invitaciones: z.array(
      z.object({ id: z.string(), email: z.string(), rol: z.string(), venceEn: z.string() }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  ...objetivo,
  async handler(ctx, input) {
    const p = requierePlataforma(ctx);
    if (!(await p.globales.tenantPorId(input.tenantId))) throw noEncontrado("La empresa");
    const e = p.empresa(input.tenantId);
    // En secuencia, no en paralelo: el pool de conexiones es chico (hoja §2.2).
    const miembros = await e.miembros();
    const invitaciones = await e.invitaciones();
    return {
      miembros: miembros.map((m) => ({
        membershipId: m.id,
        nombre: m.user.name,
        email: m.user.email,
        rol: m.rol,
        portales: m.portales,
        estado: m.estado,
        desde: iso(m.createdAt) ?? "",
      })),
      invitaciones: invitaciones
        .filter((i) => estadoInvitacion(i) === "pendiente")
        .map((i) => ({ id: i.id, email: i.email, rol: i.rol, venceEn: iso(i.expiresAt) ?? "" })),
    };
  },
});

const invitacionInput = z.object({ tenantId: uuidSchema, invitacionId: uuidSchema });

async function pendienteDe(ctx: Contexto, tenantId: string, id: string) {
  const p = requierePlataforma(ctx);
  const tenant = await p.globales.tenantPorId(tenantId);
  if (!tenant) throw noEncontrado("La empresa");
  const i = await p.empresa(tenantId).invitacion(id);
  if (!i) throw noEncontrado("La invitación");
  if (estadoInvitacion(i) !== "pendiente")
    throw reglaDeNegocio("La invitación ya no está pendiente (se aceptó, se revocó o venció).");
  return { tenant, i };
}

export const platformInvitacionesRevocar = defineCapability({
  id: "platform.invitaciones.revocar",
  descripcion:
    "Plataforma: revoca una invitación pendiente de una empresa; su enlace deja de servir. No toca a los miembros.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: invitacionInput,
  output: z.object({ id: z.string(), email: z.string(), revocada: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  ...objetivo,
  async handler(ctx, input, { dryRun }) {
    const { i } = await pendienteDe(ctx, input.tenantId, input.invitacionId);
    if (dryRun) return { id: i.id, email: i.email, revocada: true };
    const ok = await requierePlataforma(ctx).empresa(input.tenantId).revocarInvitacion(i.id);
    return { id: i.id, email: i.email, revocada: ok };
  },
});

export const platformInvitacionesReenviar = defineCapability({
  id: "platform.invitaciones.reenviar",
  descripcion:
    "Plataforma: vuelve a enviar una invitación pendiente de una empresa con un enlace nuevo (el anterior deja de servir), al mismo correo y con el mismo rol. Abre acceso a la empresa: un agente queda en aprobación humana.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: invitacionInput,
  output: z.object({ email: z.string(), rol: z.string(), venceEn: z.string() }),
  // Irreversible (ADR-055), como invitar: el correo da acceso a los datos de la empresa.
  efecto: "irreversible",
  dryRun: true,
  ...objetivo,
  async handler(ctx, input, { dryRun }) {
    const { tenant, i } = await pendienteDe(ctx, input.tenantId, input.invitacionId);
    const rol = rolSchema.safeParse(i.rol);
    if (!rol.success)
      throw reglaDeNegocio("La invitación tiene un rol que ya no existe; invita de nuevo.");
    const invitadoPor = { id: usuarioResponsable(ctx), nombre: ctx.usuario?.nombre ?? "OPAI" };
    const r = await requierePlataforma(ctx).empresa(tenant.id).invitar(
      tenant,
      {
        email: i.email,
        rol: rol.data,
        portales: i.portales,
        portalInicio: i.portalInicio,
        invitadoPor,
      },
      ctx.servicios,
      dryRun,
    );
    return { email: r.email, rol: r.rol, venceEn: r.expiresAt };
  },
});

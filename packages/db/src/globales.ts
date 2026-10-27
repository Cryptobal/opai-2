import { clienteApp } from "./client";

/** Identidad mínima para resolver al actor; nunca devuelve credenciales ni estado MFA. */
export function usuarioPorId(id: string) {
  return clienteApp().user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, platformRole: true },
  });
}

/** Resolución pública: no expone el perfil legal/comercial del tenant. */
export function tenantPorSlug(slug: string) {
  return clienteApp().tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, nombre: true, estado: true },
  });
}

/** Tenants activos o en trial: los crons iteran sobre ellos con `forTenant`. */
export function tenantsOperables() {
  return clienteApp().tenant.findMany({
    where: { estado: { in: ["activo", "trial"] } },
    select: { id: true, slug: true, timezone: true },
  });
}

/** Solo el adaptador Better Auth, dentro de packages/auth (lint). */
export function clienteAuth() {
  return clienteApp();
}

import { clienteApp } from "./client";

/**
 * Tablas globales sin tenant_id ni RLS: `tenants` (el tenant mismo) y `users` (identidad).
 * Se exponen solo estos dos delegados para resolver tenant por slug, listar tenants en
 * Plataforma y leer usuarios. Nunca se consulta una tabla de negocio por aquí.
 */
export function globales() {
  const db = clienteApp();
  return { tenant: db.tenant, user: db.user };
}

export type Globales = ReturnType<typeof globales>;

/** Lista de tenants para Plataforma (`platform.tenants.list`). La autorización es de la capacidad. */
export function listarTenants() {
  return clienteApp().tenant.findMany({ orderBy: { nombre: "asc" } });
}

/**
 * Cliente completo para el adaptador Prisma de Better Auth (`packages/auth`). Las tablas de
 * identidad no tienen RLS; el resto sigue protegido porque el rol es `opai_app`.
 * No usar fuera de `packages/auth`.
 */
export function clienteAuth() {
  return clienteApp();
}

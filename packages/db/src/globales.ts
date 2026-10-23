import { clienteApp } from "./client";

/**
 * Tablas globales sin tenant_id ni RLS: `tenants` (el tenant mismo), `users` (identidad) y las de
 * plataforma (`ajustes_plataforma`, `precios_recursos`). Se exponen solo estos delegados para
 * resolver tenant por slug, listar tenants en Plataforma, leer usuarios y leer o escribir ajustes de
 * plataforma (las escrituras solo desde capacidades `platform.*`). Nunca una tabla de negocio.
 */
export function globales() {
  const db = clienteApp();
  return {
    tenant: db.tenant,
    user: db.user,
    ajustePlataforma: db.ajustePlataforma,
    precioRecurso: db.precioRecurso,
  };
}

export type Globales = ReturnType<typeof globales>;

/** Lista de tenants para Plataforma (`platform.tenants.list`). La autorización es de la capacidad. */
export function listarTenants() {
  return clienteApp().tenant.findMany({ orderBy: { nombre: "asc" } });
}

/** Tenants activos o en trial: los crons iteran sobre ellos con `forTenant`. */
export function tenantsOperables() {
  return clienteApp().tenant.findMany({
    where: { estado: { in: ["activo", "trial"] } },
    select: { id: true, slug: true, timezone: true },
  });
}

/**
 * Cliente completo para el adaptador Prisma de Better Auth (`packages/auth`). Las tablas de
 * identidad no tienen RLS; el resto sigue protegido porque el rol es `opai_app`.
 * No usar fuera de `packages/auth`.
 */
export function clienteAuth() {
  return clienteApp();
}

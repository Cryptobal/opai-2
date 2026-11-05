import { randomUUID } from "node:crypto";

import { enTransaccion, type TenantTx } from "./transaccion";

// Datos tributarios de la empresa (razón social y RUT, en `core.perfil_empresa`) para Plataforma
// (CAR-188): se piden al crear la empresa y se corrigen desde la ficha. Operaciones con nombre y
// `select` acotado: Plataforma no lee el resto del perfil legal ni comercial de la empresa.

const campos = { rut: true, razonSocial: true } as const;

export type PerfilTributario = { rut: string | null; razonSocial: string | null };
export type DatosTributarios = { rut: string; razonSocial: string };

/** Nombre del índice único del RUT (migración 20261107120000_core_rut_empresa_unico). */
export const INDICE_RUT_UNICO = "perfil_empresa_rut_unico";

/** true solo si el error es la restricción única del RUT (no otra colisión única, como el slug). */
export function esRutRepetido(e: unknown): boolean {
  if (typeof e !== "object" || e === null || (e as { code?: unknown }).code !== "P2002")
    return false;
  return JSON.stringify((e as { meta?: unknown }).meta ?? {}).includes(INDICE_RUT_UNICO);
}

/** Operaciones sobre UNA empresa; `db` es `forTenant(tenantId)` y cada consulta filtra por `tenantId`. */
export function operacionesPerfilTributario(db: TenantTx, tenantId: string) {
  return {
    perfilTributario: (): Promise<PerfilTributario | null> =>
      db.perfilEmpresa.findFirst({ where: { tenantId }, select: campos }),
    fijarPerfilTributario: (datos: DatosTributarios): Promise<PerfilTributario> =>
      db.perfilEmpresa.upsert({
        where: { tenantId },
        update: datos,
        create: { tenantId, ...datos },
        select: campos,
      }),
  };
}

/**
 * Crea la empresa y su perfil tributario en una sola transacción: si el RUT ya lo tiene otra
 * empresa, no queda ninguna empresa a medias. El id se genera aquí para fijar el tenant de la
 * transacción antes de insertar el perfil (la RLS exige `app.tenant_id`).
 */
export function crearTenantConPerfil<T>(
  data: { slug: string; nombre: string; vertical: string; timezone: string; estado: string },
  perfil: DatosTributarios,
  select: Record<string, true>,
): Promise<T> {
  const id = randomUUID();
  return enTransaccion(id, async (tx) => {
    const tenant = await tx.tenant.create({ data: { id, ...data }, select });
    await tx.perfilEmpresa.create({ data: { tenantId: id, ...perfil } });
    return tenant as T;
  });
}

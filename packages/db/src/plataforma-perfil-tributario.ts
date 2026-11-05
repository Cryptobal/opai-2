import { randomUUID } from "node:crypto";

import { enTransaccion, type TenantTx } from "./transaccion";

// Datos tributarios de la empresa (razón social y RUT, en `core.perfil_empresa`) para Plataforma
// (CAR-188): se piden al crear la empresa y se corrigen desde la ficha. Operaciones con nombre y
// `select` acotado: Plataforma no lee el resto del perfil legal ni comercial de la empresa.

const campos = { rut: true, razonSocial: true } as const;

export type PerfilTributario = { rut: string | null; razonSocial: string | null };
export type DatosTributarios = { rut: string; razonSocial: string };

/** true si el error es el de la restricción única del RUT (otra empresa ya lo tiene). */
export function esRutRepetido(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: unknown }).code === "P2002";
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

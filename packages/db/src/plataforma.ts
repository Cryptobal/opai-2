import { clienteApp } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { operacionesAprobacionesPlataforma } from "./plataforma-aprobaciones";
import type { TenantTx } from "./transaccion";

// Perfil que devuelve tenantSchema. No expone datos legales, DPO ni otros ajustes del tenant.
const perfil = {
  id: true,
  slug: true,
  nombre: true,
  vertical: true,
  timezone: true,
  estado: true,
} as const;

const ajuste = { modulo: true, clave: true, valor: true, version: true } as const;
const precio = {
  recurso: true,
  unidad: true,
  costoUnitarioMicro: true,
  vigenteDesde: true,
} as const;

export function listarTenants(id?: string) {
  return clienteApp().tenant.findMany({
    where: id ? { id } : {},
    orderBy: { nombre: "asc" },
    select: perfil,
  });
}

/** Operaciones concretas para capacidades platform.*, autorizadas antes de invocarlas. */
export function accesoPlataforma() {
  const db = clienteApp();
  return {
    // Cola de aprobaciones y auditoría de plataforma, fuera de los tenants (CAR-36).
    ...operacionesAprobacionesPlataforma(),
    tenantPorId: (id: string) => db.tenant.findUnique({ where: { id }, select: perfil }),
    tenantPorSlug: (slug: string) => db.tenant.findUnique({ where: { slug }, select: perfil }),
    listarTenants,
    crearTenant: (data: {
      slug: string;
      nombre: string;
      vertical: string;
      timezone: string;
      estado: string;
    }) => db.tenant.create({ data, select: perfil }),
    actualizarTenant: (
      id: string,
      data: {
        nombre?: string;
        vertical?: string;
        timezone?: string;
        estado?: string;
      },
    ) => db.tenant.update({ where: { id }, data, select: perfil }),
    /** Usuarios con rol de plataforma (ADR-055): solo identidad mínima y el rol. */
    usuariosDePlataforma: () =>
      db.user.findMany({
        where: { platformRole: { not: null } },
        orderBy: { email: "asc" },
        select: { id: true, name: true, email: true, platformRole: true },
      }),
    listarAjustes: () => db.ajustePlataforma.findMany({ select: ajuste }),
    ajustePorClave: (where: Prisma.AjustePlataformaWhereUniqueInput) =>
      db.ajustePlataforma.findUnique({ where, select: ajuste }),
    /** Con `tx`, en la transacción de la escritura y su auditoría (CAR-41: falla cerrado). */
    guardarAjuste: (
      {
        where,
        create,
        update,
      }: Pick<Prisma.AjustePlataformaUpsertArgs, "where" | "create" | "update">,
      tx?: TenantTx,
    ) => (tx ?? db).ajustePlataforma.upsert({ where, create, update, select: ajuste }),
    listarPrecios: (hasta: Date) => preciosHasta(hasta),
    precioPorVigencia: (where: Prisma.PrecioRecursoWhereUniqueInput) =>
      db.precioRecurso.findUnique({ where, select: precio }),
    guardarPrecio: (
      {
        where,
        create,
        update,
      }: Pick<Prisma.PrecioRecursoUpsertArgs, "where" | "create" | "update">,
      tx?: TenantTx,
    ) => (tx ?? db).precioRecurso.upsert({ where, create, update, select: precio }),
  };
}

export function preciosHasta(hasta: Date) {
  return clienteApp().precioRecurso.findMany({
    where: { vigenteDesde: { lte: hasta } },
    orderBy: [{ recurso: "asc" }, { vigenteDesde: "desc" }],
    select: precio,
  });
}

export type Globales = ReturnType<typeof accesoPlataforma>;

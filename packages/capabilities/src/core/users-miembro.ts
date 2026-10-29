import { z } from "zod";

import { noEncontrado } from "../errores";
import type { Contexto } from "../types";

/** Fila de usuario de la empresa, con su rol personalizado (si lo tiene) y su último acceso. */
export const miembroSchema = z.object({
  id: z.string(),
  userId: z.string(),
  nombre: z.string(),
  email: z.string(),
  /** Rol base (ADR-016): jerarquía y etiqueta. */
  rol: z.string(),
  /** Rol personalizado del tenant, o null si usa su rol base (A02/A17/A21). */
  roleId: z.string().nullable(),
  /** Nombre del rol personalizado, o null (para pintar la etiqueta sin otra consulta). */
  rolNombre: z.string().nullable(),
  portales: z.array(z.string()),
  estado: z.string(),
  /** Último acceso del usuario (A02/A18); null si no hay sesión registrada. */
  ultimoAccesoEn: z.date().nullable(),
  /** Excepciones de permiso vigentes (A01: «Con excepciones» con el número). */
  excepciones: z.number(),
  /** Segundo factor activo (CAR-54): decide si la ficha ofrece restablecerlo. */
  mfaActiva: z.boolean(),
});

export type Miembro = z.infer<typeof miembroSchema>;

type FilaMembresia = {
  id: string;
  userId: string;
  rol: string;
  roleId: string | null;
  portales: string[];
  estado: string;
  user: { name: string; email: string; twoFactorEnabled: boolean };
  rolTenant: { nombre: string } | null;
  _count?: { excepciones: number };
};

/** Relaciones de una fila de usuario: identidad, rol personalizado y cuántas excepciones tiene. */
export const INCLUIR_MIEMBRO = {
  user: true,
  rolTenant: true,
  _count: { select: { excepciones: true } },
} as const;

export function aMiembro(m: FilaMembresia, ultimoAccesoEn: Date | null): Miembro {
  return {
    id: m.id,
    userId: m.userId,
    nombre: m.user.name,
    email: m.user.email,
    rol: m.rol,
    roleId: m.roleId ?? null,
    rolNombre: m.rolTenant?.nombre ?? null,
    portales: m.portales,
    estado: m.estado,
    ultimoAccesoEn,
    excepciones: m._count?.excepciones ?? 0,
    mfaActiva: m.user.twoFactorEnabled ?? false,
  };
}

/**
 * Último acceso por usuario a partir de las sesiones de Better Auth (`core.sessions`, sin tenant): la
 * sesión más reciente de cada uno. `core.sessions` no tiene RLS ni `opai_app` tiene acceso directo
 * (CAR-43): `ctx.identidad` (servicio inyectado, no un delegado de `ctx.db`) usa el rol `opai_auth`
 * y columnas mínimas, nunca el token. No toca el flujo de login (que evita un oráculo de
 * enumeración); una sesión expirada y purgada deja el último acceso en null (no bloqueante, A02).
 */
export async function ultimosAccesos(
  ctx: Contexto,
  userIds: readonly string[],
): Promise<Map<string, Date>> {
  return ctx.identidad.ultimoAcceso(userIds);
}

export async function buscar(ctx: Contexto, id: string): Promise<Miembro> {
  const m = await ctx.db.membership.findUnique({
    where: { id },
    include: INCLUIR_MIEMBRO,
  });
  if (!m) throw noEncontrado("El usuario");
  const ultimo = (await ultimosAccesos(ctx, [m.userId])).get(m.userId) ?? null;
  return aMiembro(m, ultimo);
}

/** Owners activos además del indicado. El último owner nunca se degrada, suspende ni elimina. */
export async function quedanOtrosOwners(ctx: Contexto, excepto: string): Promise<boolean> {
  const n = await ctx.db.membership.count({
    where: { rol: "owner", estado: "activa", id: { not: excepto } },
  });
  return n > 0;
}

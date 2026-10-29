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
});

export type Miembro = z.infer<typeof miembroSchema>;

type FilaMembresia = {
  id: string;
  userId: string;
  rol: string;
  roleId: string | null;
  portales: string[];
  estado: string;
  user: { name: string; email: string };
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
  };
}

/**
 * Último acceso por usuario: la sesión más reciente de cada uno (`core.sessions`, sin tenant), leída
 * por `ctx.identidad` con el rol de auth y solo `userId` y fecha (CAR-43). Una sesión expirada y
 * purgada deja el último acceso en null (no bloqueante, A02).
 */
export function ultimosAccesos(ctx: Contexto, userIds: readonly string[]) {
  return ctx.identidad.ultimosAccesos(userIds);
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

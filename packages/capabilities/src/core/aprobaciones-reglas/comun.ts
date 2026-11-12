import { esAprobadorDeRegla, PERMISOS_CORE, puedeResolver, type ReglaAprobacion } from "@opai/domain";

import type { Contexto } from "../../types";

/** Quién es la persona frente a las reglas (CAR-252): su rol base, su rol personalizado y sus grupos. */
export type PersonaAprobadora = { rol: string | null; roleId: string | null; grupos: string[] };

/** Regla tal como se guarda: el monto viene como BigInt de la base. */
type FilaRegla = Omit<ReglaAprobacion, "montoMinimo"> & { montoMinimo: bigint | null };

export const reglaDeFila = (f: FilaRegla): ReglaAprobacion => ({
  ...f,
  montoMinimo: f.montoMinimo === null ? null : Number(f.montoMinimo),
});

/** Dueños y administradores (o quien tenga `core:aprobaciones.manage`) aprueban todo, siempre. */
export const apruebaTodo = (ctx: Contexto) => ctx.autorizar(PERMISOS_CORE.aprobacionesManage);

export async function personaAprobadora(ctx: Contexto): Promise<PersonaAprobadora | null> {
  const userId = ctx.actor.tipo === "user" ? ctx.actor.id : null;
  if (!userId) return null;
  const [m, grupos] = await Promise.all([
    ctx.db.membership.findFirst({ where: { userId }, select: { rol: true, roleId: true } }),
    ctx.db.grupoUsuarioMiembro.findMany({ where: { userId }, select: { grupoId: true } }),
  ]);
  return { rol: m?.rol ?? null, roleId: m?.roleId ?? null, grupos: grupos.map((g) => g.grupoId) };
}

/** Aprobador de la regla por rol base, rol personalizado o grupo. */
export const esAprobador = (r: ReglaAprobacion, p: PersonaAprobadora) =>
  esAprobadorDeRegla(r, p) || (!!r.aprobadorRol && r.aprobadorRol === p.roleId);

/**
 * Filtro de Prisma con las aprobaciones que la persona ve: todas si aprueba todo; si no, solo las que
 * pidieron reglas donde es aprobadora. `null` = sin filtro.
 */
export async function filtroAprobacionesVisibles(
  ctx: Contexto,
): Promise<{ reglaId: { in: string[] } } | null> {
  if (apruebaTodo(ctx)) return null;
  const p = await personaAprobadora(ctx);
  if (!p) return { reglaId: { in: [] } };
  const reglas = await ctx.db.reglaAprobacion.findMany({});
  return { reglaId: { in: reglas.map(reglaDeFila).filter((r) => esAprobador(r, p)).map((r) => r.id) } };
}

/** Si la persona puede resolver esta solicitud (regla + nadie lo propio, salvo quien aprueba todo). */
export async function puedeResolverSolicitud(
  ctx: Contexto,
  a: { reglaId: string | null; viaUserId: string },
): Promise<boolean> {
  const todo = apruebaTodo(ctx);
  const esSolicitante = ctx.actor.tipo === "user" && ctx.actor.id === a.viaUserId;
  if (todo || !a.reglaId) return puedeResolver({ apruebaTodo: todo, esAprobador: false, esSolicitante });
  const [fila, p] = await Promise.all([
    ctx.db.reglaAprobacion.findFirst({ where: { id: a.reglaId } }),
    personaAprobadora(ctx),
  ]);
  const esAprob = !!fila && !!p && esAprobador(reglaDeFila(fila), p);
  return puedeResolver({ apruebaTodo: false, esAprobador: esAprob, esSolicitante });
}

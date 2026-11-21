import { esRol, puedeAsignarRol, type PortalVerComo } from "@opai/domain";

import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";

/** A quién se verá: la persona (su usuario) o el equipo de Terreno de la instalación. */
export type ObjetivoVerComo = {
  nombre: string;
  userId: string | null;
  personaId: string | null;
  dispositivoId: string | null;
};

/** Quien mira no ve como alguien de rol superior al suyo (un admin no ve como el owner). */
export function rolVisible(ctx: Contexto, rol: string): boolean {
  return ctx.rol !== null && esRol(rol) && puedeAsignarRol(ctx.rol, rol);
}
/**
 * Membresía activa en esta empresa con el portal, y de rol no superior al de quien mira (un admin no
 * ve como el owner). La consulta va por `ctx.db`: otra empresa responde como inexistente.
 */
async function miembroVisible(
  ctx: Contexto,
  where: { userId: string } | { id: string },
  portal: string,
) {
  const m = await ctx.db.membership.findFirst({
    where: { ...where, estado: "activa" },
    select: { userId: true, rol: true, portales: true },
  });
  if (!m || !m.portales.includes(portal))
    throw reglaDeNegocio("Esa persona no tiene acceso activo a ese portal.");
  if (!rolVisible(ctx, m.rol))
    throw prohibido("No puedes ver como alguien de un rol superior al tuyo.");
  return m.userId;
}

async function trabajador(ctx: Contexto, id: string): Promise<ObjetivoVerComo> {
  if (!ctx.modulosActivos.includes("portal_trabajador"))
    throw reglaDeNegocio("El portal del trabajador no está activo en la empresa.");
  const p = await ctx.db.persona.findFirst({
    where: { id, estado: "activo", archivadaEn: null, anonimizadaEn: null },
    select: { id: true, nombres: true, apellidos: true, usuarioId: true },
  });
  if (!p) throw noEncontrado("La persona");
  const nombre = `${p.nombres} ${p.apellidos}`;
  if (!p.usuarioId) return { nombre, userId: null, personaId: p.id, dispositivoId: null };
  const userId = await miembroVisible(ctx, { userId: p.usuarioId }, "trabajador");
  return { nombre, userId, personaId: p.id, dispositivoId: null };
}

/** Por contacto: cada contacto del cliente ve sus propias instalaciones. */
async function cliente(ctx: Contexto, id: string): Promise<ObjetivoVerComo> {
  const a = await ctx.db.accesoCliente.findFirst({
    where: { id, estado: "activo" },
    select: { membershipId: true, cuentaId: true },
  });
  if (!a) throw noEncontrado("El acceso del cliente");
  const userId = await miembroVisible(ctx, { id: a.membershipId }, "cliente");
  const [cuenta, usuario] = await Promise.all([
    ctx.db.cuenta.findFirst({ where: { id: a.cuentaId }, select: { nombre: true } }),
    ctx.db.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);
  return {
    nombre: `${cuenta?.nombre ?? "Cliente"} · ${usuario?.name ?? "Contacto"}`,
    userId,
    personaId: null,
    dispositivoId: null,
  };
}

/** Con el equipo emparejado activo más reciente de la instalación; sin equipo no hay qué ver. */
async function terreno(ctx: Contexto, id: string): Promise<ObjetivoVerComo> {
  const i = await ctx.db.instalacion.findFirst({
    where: { id, archivadaEn: null },
    select: { nombre: true },
  });
  if (!i) throw noEncontrado("La instalación");
  const d = await ctx.db.dispositivo.findFirst({
    where: { instalacionId: id, estado: "activo" },
    orderBy: { emparejadoEn: "desc" },
    select: { id: true },
  });
  if (!d) throw reglaDeNegocio("Esa instalación no tiene un equipo de Terreno emparejado.");
  return { nombre: i.nombre, userId: null, personaId: null, dispositivoId: d.id };
}

async function supervisor(ctx: Contexto, id: string): Promise<ObjetivoVerComo> {
  const userId = await miembroVisible(ctx, { id }, "supervisor");
  const u = await ctx.db.user.findUnique({ where: { id: userId }, select: { name: true } });
  return { nombre: u?.name ?? "Supervisor", userId, personaId: null, dispositivoId: null };
}

const POR_PORTAL = { trabajador, cliente, terreno, supervisor } satisfies Record<
  PortalVerComo,
  (ctx: Contexto, id: string) => Promise<ObjetivoVerComo>
>;

/** Resuelve el objetivo en la empresa actual. Quien mira debe ver toda la empresa (sin alcance por filas). */
export async function objetivoVerComo(
  ctx: Contexto,
  portal: PortalVerComo,
  id: string,
  porUserId: string,
): Promise<ObjetivoVerComo> {
  if (ctx.alcance) throw prohibido("«Ver como» es para quien ve toda la empresa.");
  const o = await POR_PORTAL[portal](ctx, id);
  if (o.userId !== null && o.userId === porUserId)
    throw reglaDeNegocio("Esa persona eres tú: abre el portal directamente.");
  return o;
}

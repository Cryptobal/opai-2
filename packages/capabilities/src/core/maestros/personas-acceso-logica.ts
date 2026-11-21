import { esMembresiaPortalTrabajador, type Rol } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { conflicto, reglaDeNegocio } from "../../errores";
import { emailSchema } from "../esquemas";
import type { Contexto } from "../../types";

export function correoPortalPersona(p: {
  emailLaboral: string | null;
  emailPersonal: string | null;
}): string | null {
  const raw = p.emailLaboral ?? p.emailPersonal ?? "";
  const r = emailSchema.safeParse(raw);
  return r.success ? r.data.toLowerCase() : null;
}

export function portalesInvitacionTrabajador(ctx: Contexto): string[] {
  const portales = ["trabajador"];
  if (ctx.modulosActivos.includes("terreno")) portales.push("terreno");
  return portales;
}

export function esInternoParaPortalTrabajador(rol: string, portales: readonly string[]): boolean {
  return !esMembresiaPortalTrabajador(rol as Rol, portales);
}

async function invitadorAutomatico(tx: TenantTx, tenantId: string) {
  const m = await tx.membership.findFirst({
    where: { tenantId, rol: "owner", estado: "activa" },
    select: { userId: true },
  });
  if (!m) throw reglaDeNegocio("No hay un owner para registrar la invitación.");
  return { id: m.userId, nombre: "OPAI" };
}

/** Añade portales de trabajador (y terreno si aplica) a una membresía viewer. */
export async function ampliarPortalesTrabajador(
  ctx: Contexto,
  membershipId: string,
  dryRun: boolean,
) {
  const portales = portalesInvitacionTrabajador(ctx);
  if (dryRun) return;
  await ctx.transaccion(async (tx) => {
    const m = await tx.membership.findFirst({
      where: { id: membershipId, estado: "activa" },
      select: { portales: true },
    });
    if (!m) return;
    const falta = portales.filter((p) => !m.portales.includes(p));
    if (!falta.length) return;
    await tx.membership.update({
      where: { id: membershipId },
      data: { portales: [...m.portales, ...falta] },
    });
  });
}

/** Vincula persona 1:1; rechaza owner y otras personas con el mismo usuario. */
export async function vincularPersonaUsuario(
  ctx: Contexto,
  personaId: string,
  usuarioId: string,
  dryRun: boolean,
) {
  const m = await ctx.db.membership.findFirst({
    where: { userId: usuarioId, estado: "activa" },
    select: { id: true, rol: true, portales: true },
  });
  if (!m) throw reglaDeNegocio("El usuario no tiene una membresía activa en la empresa.");
  if (esInternoParaPortalTrabajador(m.rol, m.portales)) {
    throw reglaDeNegocio("Ese usuario es interno de la empresa, no puede usar el portal del trabajador.");
  }
  if (m.rol === "owner") throw reglaDeNegocio("No se puede vincular al dueño de la empresa.");
  const otra = await ctx.db.persona.findFirst({
    where: { usuarioId, id: { not: personaId }, archivadaEn: null, anonimizadaEn: null },
    select: { id: true },
  });
  if (otra) throw conflicto("Ese usuario ya está vinculado a otra persona.");
  await ampliarPortalesTrabajador(ctx, m.id, dryRun);
  if (dryRun) return;
  await ctx.transaccion((tx) =>
    tx.persona.updateMany({
      where: { id: personaId, archivadaEn: null, anonimizadaEn: null },
      data: { usuarioId },
    }),
  );
}

export async function invitadorDe(ctx: Contexto) {
  if (ctx.actor.tipo === "user") {
    return { id: ctx.actor.id, nombre: ctx.usuario?.nombre ?? "OPAI" };
  }
  if (ctx.actor.tipo === "agent") {
    return { id: ctx.actor.viaUserId, nombre: ctx.usuario?.nombre ?? "OPAI" };
  }
  return ctx.transaccion((tx) => invitadorAutomatico(tx, ctx.tenantId));
}
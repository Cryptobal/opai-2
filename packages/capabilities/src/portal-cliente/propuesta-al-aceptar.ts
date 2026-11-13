import { defineConsumidor } from "../eventos/consumidores";
import type { Contexto } from "../types";
import { asegurarAccesoContacto } from "./acceso-contacto";
import { registrarPropuestaEnviada } from "./propuesta-vigente";

export type ResultadoAlAceptar = { cuentaId: string; cotizacionId: string | null }[];

/**
 * El contacto de un prospecto que fue INVITADO al enviarle una propuesta no tenía acceso donde registrarla
 * (CAR-300). Al aceptar la invitación se le vincula con alcance «limitado» y se registra como vigente la
 * última cotización enviada de su cuenta (no archivada). Solo cuentas prospecto; un acceso suspendido o
 * revocado a mano no se toca (lo resuelven `asegurarAccesoContacto` y `registrarPropuestaEnviada`).
 */
export async function propuestaAlAceptar(ctx: Contexto, membershipId: string): Promise<ResultadoAlAceptar> {
  if (!ctx.modulosActivos.includes("portal_cliente")) return [];
  const m = await ctx.db.membership.findUnique({
    where: { id: membershipId },
    select: { tenantId: true, user: { select: { email: true } } },
  });
  const email = m?.tenantId === ctx.tenantId ? m.user.email.trim().toLowerCase() : "";
  if (!email) return [];
  const contactos = await ctx.db.contacto.findMany({
    where: {
      tenantId: ctx.tenantId,
      email: { equals: email, mode: "insensitive" },
      estado: "activo",
      archivadoEn: null,
      cuenta: { estado: "prospecto", archivadaEn: null },
    },
    select: { id: true, cuentaId: true },
    orderBy: { createdAt: "asc" },
  });
  const r: ResultadoAlAceptar = [];
  for (const c of contactos) {
    const acceso = await asegurarAccesoContacto(ctx, { cuentaId: c.cuentaId, contactoId: c.id }, false);
    if (acceso.estado !== "vinculado" && acceso.estado !== "ya_tiene_acceso") continue;
    const negocios = await ctx.db.negocio.findMany({ where: { tenantId: ctx.tenantId, cuentaId: c.cuentaId }, select: { id: true } });
    const ultima = await ctx.db.cpqVersion.findFirst({
      where: {
        tenantId: ctx.tenantId,
        estado: "enviada",
        cotizacion: { archivadaEn: null, negocioId: { in: negocios.map((n) => n.id) } },
      },
      orderBy: { enviadaEn: "desc" },
      select: { cotizacionId: true },
    });
    if (ultima)
      await registrarPropuestaEnviada(ctx, { cuentaId: c.cuentaId, contactoId: c.id, cotizacionId: ultima.cotizacionId, vigenteHasta: null });
    r.push({ cuentaId: c.cuentaId, cotizacionId: ultima?.cotizacionId ?? null });
  }
  return r;
}

export const consumidorPropuestaAlAceptar = defineConsumidor({
  id: "portal_cliente.prospecto.al_aceptar",
  descripcion: "Al aceptar la invitación, el contacto de un prospecto ve la última propuesta enviada a su cuenta.",
  eventos: ["core.membresia.creada"],
  async handler(ctx, ev) {
    if (ev.entidadId) await propuestaAlAceptar(ctx, ev.entidadId);
  },
});

import { esMembresiaDeCliente, type Rol } from "@opai/domain";

import { tenantActual, usuarioResponsable } from "../core/comun";
import { emailSchema } from "../core/esquemas";
import { crearInvitacion } from "../core/invitar";
import type { Contexto } from "../types";
import { vincularAcceso } from "./accesos-vincular-logica";
import { cuentaDe } from "./comun";

/**
 * Qué pasó (o pasaría, en vista previa) con el acceso al Portal Cliente de un contacto:
 * - `ya_tiene_acceso`: ya está vinculado y activo; no se repite nada.
 * - `vinculado`: tenía usuario de cliente sin vincular y se vinculó a su cuenta.
 * - `invitado`: no tenía usuario; se le envió la invitación del núcleo.
 * - `invitacion_pendiente`: ya hay una invitación vigente; no se reinvita.
 * - `no_aplica`: no corresponde crear acceso (módulo apagado, correo inválido, usuario interno,
 *   acceso suspendido o revocado a propósito, o vinculado a otra cuenta).
 */
export type EstadoAccesoContacto =
  | "ya_tiene_acceso"
  | "vinculado"
  | "invitado"
  | "invitacion_pendiente"
  | "no_aplica";

export type ResultadoAccesoContacto = { estado: EstadoAccesoContacto; motivo?: string };

const no = (motivo: string): ResultadoAccesoContacto => ({ estado: "no_aplica", motivo });

/**
 * Deja al contacto de una cuenta con acceso a su Portal Cliente, reutilizando el flujo del núcleo:
 * invitación (`core.users.invite`: viewer, portal «cliente») y vínculo (`portal_cliente.accesos.vincular`).
 * Idempotente: reenviar no duplica la invitación ni vuelve a vincular. Mínimo privilegio: el vínculo
 * no habilita instalaciones (el contacto ve lo que se le comparte a su cuenta, no sus guardias); el
 * administrador las amplía en Configuración. Tenant y cuenta se validan en la consulta. En `dryRun` no
 * escribe ni envía nada y devuelve lo que haría. El permiso lo exige quien llama (el envío de CPQ).
 */
export async function asegurarAccesoContacto(
  ctx: Contexto,
  input: { cuentaId: string; contactoId: string },
  dryRun: boolean,
): Promise<ResultadoAccesoContacto> {
  if (!ctx.modulosActivos.includes("portal_cliente")) return no("portal_cliente_apagado");
  const cuenta = await cuentaDe(ctx, input.cuentaId);
  if (cuenta.archivadaEn) return no("cuenta_archivada");
  const contacto = await ctx.db.contacto.findFirst({
    where: { id: input.contactoId, cuentaId: cuenta.id, tenantId: ctx.tenantId },
    select: { id: true, email: true, estado: true, archivadoEn: true, anonimizadoEn: true },
  });
  if (!contacto || contacto.estado !== "activo" || contacto.archivadoEn || contacto.anonimizadoEn)
    return no("contacto_no_vigente");
  const correo = emailSchema.safeParse(contacto.email ?? "");
  if (!correo.success) return no("correo_invalido");
  const email = correo.data.toLowerCase();

  const usuario = await ctx.db.user.findUnique({ where: { email } });
  const m = usuario
    ? await ctx.db.membership.findUnique({
        where: { tenantId_userId: { tenantId: ctx.tenantId, userId: usuario.id } },
        select: { id: true, rol: true, portales: true, estado: true },
      })
    : null;
  if (m) {
    if (m.estado !== "activa" || !esMembresiaDeCliente(m.rol as Rol, m.portales))
      return no("usuario_interno");
    const acceso = await ctx.db.accesoCliente.findUnique({
      where: { tenantId_membershipId: { tenantId: ctx.tenantId, membershipId: m.id } },
      select: { estado: true, cuentaId: true },
    });
    if (acceso) {
      if (acceso.cuentaId !== cuenta.id) return no("vinculado_a_otra_cuenta");
      return acceso.estado === "activo" ? { estado: "ya_tiene_acceso" } : no(`acceso_${acceso.estado}`);
    }
    await vincularAcceso(
      ctx,
      { membershipId: m.id, cuentaId: cuenta.id, contactoId: contacto.id, todasInstalaciones: false, instalacionIds: [] },
      dryRun,
    );
    return { estado: "vinculado" };
  }

  const pendiente = await ctx.db.invitation.findFirst({
    where: { email, acceptedAt: null, revocadaEn: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (pendiente) return { estado: "invitacion_pendiente" };
  const tenant = await tenantActual(ctx);
  const nombre = ctx.usuario?.nombre ?? "OPAI";
  await crearInvitacion(
    ctx.db,
    tenant,
    { email, rol: "viewer", portales: ["cliente"], portalInicio: "cliente", invitadoPor: { id: usuarioResponsable(ctx), nombre } },
    ctx.servicios,
    dryRun,
  );
  return { estado: "invitado" };
}

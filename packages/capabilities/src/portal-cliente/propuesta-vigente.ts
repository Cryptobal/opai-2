import { esMembresiaDeCliente, type Rol } from "@opai/domain";

import type { Contexto } from "../types";
import { cuentaDe } from "./comun";

export type ResultadoPropuesta = "registrada" | "no_aplica";

/**
 * Registra la propuesta que se acaba de enviar a un contacto como la VIGENTE de su acceso «limitado» (CAR-300,
 * propuesta §3.3): la anterior pasa a «reemplazada». Solo toca un acceso `activo` de alcance «limitado» de la
 * misma cuenta: uno suspendido o revocado a mano no se reactiva, y un cliente con acceso completo ya ve todas
 * sus cotizaciones enviadas. No lanza: el envío del correo no debe fallar por el portal.
 */
export async function registrarPropuestaEnviada(
  ctx: Contexto,
  input: { cuentaId: string; contactoId: string; cotizacionId: string; vigenteHasta: Date | null },
): Promise<ResultadoPropuesta> {
  if (!ctx.modulosActivos.includes("portal_cliente")) return "no_aplica";
  const cuenta = await cuentaDe(ctx, input.cuentaId);
  const contacto = await ctx.db.contacto.findFirst({
    where: { id: input.contactoId, cuentaId: cuenta.id },
    select: { email: true },
  });
  if (!contacto?.email) return "no_aplica";
  const usuario = await ctx.db.user.findUnique({ where: { email: contacto.email.toLowerCase() } });
  const m = usuario
    ? await ctx.db.membership.findUnique({
        where: { tenantId_userId: { tenantId: ctx.tenantId, userId: usuario.id } },
        select: { id: true, rol: true, portales: true, estado: true },
      })
    : null;
  if (!m || m.estado !== "activa" || !esMembresiaDeCliente(m.rol as Rol, m.portales)) return "no_aplica";
  const acceso = await ctx.db.accesoCliente.findUnique({
    where: { tenantId_membershipId: { tenantId: ctx.tenantId, membershipId: m.id } },
    select: { id: true, cuentaId: true, estado: true, alcance: true },
  });
  if (!acceso || acceso.cuentaId !== cuenta.id || acceso.estado !== "activo" || acceso.alcance !== "limitado")
    return "no_aplica";
  await ctx.transaccion(async (tx) => {
    await tx.accesoPropuesta.updateMany({
      where: { accesoId: acceso.id, estado: "vigente", cotizacionId: { not: input.cotizacionId } },
      data: { estado: "reemplazada" },
    });
    const ya = await tx.accesoPropuesta.findFirst({
      where: { accesoId: acceso.id, cotizacionId: input.cotizacionId, estado: "vigente" },
      select: { id: true },
    });
    if (ya) {
      await tx.accesoPropuesta.update({ where: { id: ya.id }, data: { enviadaEn: new Date(), vigenteHasta: input.vigenteHasta } });
    } else {
      await tx.accesoPropuesta.create({
        data: { tenantId: ctx.tenantId, accesoId: acceso.id, cotizacionId: input.cotizacionId, enviadaEn: new Date(), vigenteHasta: input.vigenteHasta, estado: "vigente" },
      });
    }
  });
  return "registrada";
}

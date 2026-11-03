import { noEncontrado, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import type { DestinatarioEnvio } from "../domain/documento/propuesta-tecnica";

/** R-CPQ-036: todo contactoId pertenece a la cuenta del negocio y tiene correo. */
export async function validarDestinatariosEnvioCuenta(
  ctx: Contexto,
  cuentaId: string | null | undefined,
  destinatarios: readonly DestinatarioEnvio[],
) {
  if (!cuentaId) {
    throw reglaDeNegocio("El negocio no tiene cuenta asociada; no se pueden validar contactos.");
  }
  for (const d of destinatarios) {
    if (!d.contactoId) continue;
    const contacto = await ctx.db.contacto.findFirst({
      where: { id: d.contactoId },
      select: { tenantId: true, cuentaId: true, email: true, nombres: true, apellidos: true },
    });
    if (!contacto) throw noEncontrado("El contacto");
    if (contacto.tenantId !== ctx.tenantId) {
      throw reglaDeNegocio("El contacto no pertenece a la empresa de la sesión.");
    }
    if (contacto.cuentaId !== cuentaId) {
      throw reglaDeNegocio("El contacto no pertenece a la cuenta del negocio.");
    }
    if (!contacto.email?.trim()) {
      throw reglaDeNegocio("El contacto debe tener correo para enviar la propuesta.");
    }
  }
}

export function exigirVersionDeCotizacion(
  version: { id: string; cotizacionId: string },
  cotizacionId: string,
) {
  if (version.cotizacionId !== cotizacionId) {
    throw reglaDeNegocio("La versión no pertenece a esta cotización.");
  }
}

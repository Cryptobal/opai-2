import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

/**
 * Correo del deudor que Octava exige al ceder (CAR-267). Orden: la casilla DTE de la cuenta, el destinatario
 * principal guardado en el documento y el primer contacto de facturación activo de la cuenta (mismo criterio que
 * el envío al cliente). `null` si no hay ninguno; quien llama decide si el proveedor lo exige.
 */
export async function correoDeudorCesion(
  ctx: Contexto,
  doc: { id: string; cuentaId: string },
  emailDte: string | null,
): Promise<string | null> {
  if (emailDte?.trim()) return emailDte.trim();
  const para = await ctx.db.documentoEmitidoDestinatario.findFirst({
    where: { documentoId: doc.id, tipo: "PARA" },
    orderBy: { orden: "asc" },
    select: { email: true },
  });
  if (para?.email) return para.email;
  const contacto = await ctx.db.contacto.findFirst({
    where: {
      cuentaId: doc.cuentaId,
      estado: "activo",
      archivadoEn: null,
      anonimizadoEn: null,
      email: { not: null },
      roles: { has: "facturacion" },
    },
    select: { email: true },
    orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
  });
  return contacto?.email ?? null;
}

/** Octava exige el correo del deudor: sin él se avisa qué completar antes de reservar la cesión. */
export function exigirCorreoDeudor(proveedor: string, email: string | null): void {
  if (proveedor === "octava" && !email) {
    throw reglaDeNegocio(
      "Octava exige el correo del cliente (deudor). Agrega un contacto con rol facturación y correo en la cuenta del cliente y vuelve a ceder.",
    );
  }
}

// Borrador de un paso de persona (R9, CAR-160): la tarea del vendedor lleva el correo ya preparado y la
// hoja «Enviar correo» parte de él. El texto del plan (guion) manda; si falta, un texto base editable.
import type { PasoPlan } from "./seguimiento-plan";

export type BorradorCorreo = { asunto: string; cuerpo: string };

/** Asunto del correo de seguimiento, con el código de la cotización si se conoce. */
export const asuntoSeguimiento = (cotizacionCodigo: string | null) =>
  `Seguimiento${cotizacionCodigo ? ` de la cotización ${cotizacionCodigo}` : ""}`;

/** Borrador del correo de un paso por correo; `null` para otros canales. */
export function borradorCorreoPaso(paso: Pick<PasoPlan, "canal" | "guion">, cotizacionCodigo: string | null): BorradorCorreo | null {
  if (paso.canal !== "correo") return null;
  const cuerpo = paso.guion?.trim()
    || `Hola:\n\nTe escribo para saber si pudiste revisar ${cotizacionCodigo ? `la cotización ${cotizacionCodigo}` : "nuestra cotización"}. Quedo atento a tus comentarios o dudas.\n\nSaludos.`;
  return { asunto: asuntoSeguimiento(cotizacionCodigo), cuerpo };
}

/** Detalle de la tarea: el borrador del correo, o el guion de la llamada o del WhatsApp. */
export function detalleTareaPaso(paso: Pick<PasoPlan, "canal" | "guion">, borrador: BorradorCorreo | null): string | null {
  if (borrador) return `Correo preparado para enviar desde el seguimiento del negocio.\nAsunto: ${borrador.asunto}\n\n${borrador.cuerpo}`;
  return paso.guion?.trim() || null;
}

import type { Contexto } from "@opai/capabilities";

import type { DestinatarioEnvio } from "../domain/documento/propuesta-tecnica";
import { enviarCorreoCliente, type PdfParaCorreo } from "./correo-cliente";

/** Un correo por destinatario con los PDF del envío; el acceso al portal se resuelve por contacto. */
export async function enviarCorreosEnvioPropuesta(
  ctx: Contexto,
  destinatarios: readonly DestinatarioEnvio[],
  datos: { cuentaId: string; codigo: string; titulo: string; version: number | null; mensaje: string },
  pdfs: readonly PdfParaCorreo[],
) {
  if (ctx.actor.tipo === "agent") return;
  for (const d of destinatarios) {
    await enviarCorreoCliente(ctx, {
      para: d.email,
      contactoId: d.contactoId ?? null,
      cuentaId: datos.cuentaId,
      codigo: datos.codigo,
      titulo: datos.titulo,
      version: datos.version,
      mensaje: datos.mensaje,
      pdfs,
    });
  }
}

/** PDF del envío listo para el correo (nombre sin acentos: viaja como nombre de archivo adjunto). */
export function pdfParaCorreo(
  clave: "cotizacion" | "propuesta",
  codigo: string,
  contenido: Uint8Array,
  storageKey: string | null,
): PdfParaCorreo {
  const nombre = `${clave === "cotizacion" ? "Cotizacion" : "Propuesta-tecnica"}-${codigo}.pdf`;
  return { clave, nombre, bytes: contenido.byteLength, contenido, storageKey };
}

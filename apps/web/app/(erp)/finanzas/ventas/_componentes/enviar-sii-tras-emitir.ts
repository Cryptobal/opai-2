import { avisar } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { mensajeDeError } from "@/lib/mensajes-error";

// Un corte de red no deja saber si el SII recibió el documento: nunca se invita a reenviar a ciegas.
const SIN_CONFIRMAR = "No se pudo confirmar el envío. Revisa el estado del documento antes de reenviarlo: si el SII ya lo recibió, un reenvío sale rechazado por repetido.";

/** Envía un documento y devuelve `null` si quedó enviado, o el motivo que debe leer la persona si no. */
async function enviar(documentoId: string): Promise<string | null> {
  try {
    const r = await ejecutarCapacidad("erp", "finanzas.ventas.enviar_sii", { documentoId });
    // El mensaje del servidor distingue un rechazo (se puede reintentar) de un resultado incierto (no reenviar a ciegas).
    return r.ok ? null : mensajeDeError(r.error.code, r.error.message);
  } catch {
    return SIN_CONFIRMAR;
  }
}

/**
 * Tras emitir, el documento se envía al SII de inmediato (decisión de Carlos del 11-nov-2026, ADR-096). Va después de
 * la emisión y no dentro de ella: la emisión ya quedó guardada con su folio, así que un envío fallido no la deshace;
 * el documento queda «Firmada, sin enviar al SII» y el aviso conserva el motivo que dio el servidor.
 */
export async function enviarAlSiiTrasEmitir(documentoId: string, nombre: string): Promise<boolean> {
  const motivo = await enviar(documentoId);
  if (motivo === null) avisar.exito(`${nombre} emitida y enviada al SII`);
  else avisar.error(`${nombre} emitida, pero quedó sin enviar al SII. ${motivo}`);
  return motivo === null;
}

/** Lo mismo para la emisión en lote: una por una. Si alguna falla, no recomienda reenviar sin revisar. */
export async function enviarLoteAlSii(documentoIds: readonly string[]): Promise<void> {
  let fallidas = 0;
  for (const documentoId of documentoIds) if ((await enviar(documentoId)) !== null) fallidas += 1;
  const n = documentoIds.length;
  const plural = n === 1 ? "" : "s";
  if (fallidas === 0) avisar.exito(`${n} documento${plural} emitido${plural} y enviado${plural} al SII`);
  else avisar.error(`${n} emitido${plural}; ${fallidas} sin enviar al SII. Ábrelos en Ventas y revisa su estado antes de reenviar.`);
}

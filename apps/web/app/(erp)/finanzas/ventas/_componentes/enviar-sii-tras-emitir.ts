import { avisar } from "@opai/ds";

import type { useCapacidad } from "@/app/_components/use-capacidad";

type Ejecutar = ReturnType<typeof useCapacidad>["ejecutar"];

const SIN_ENVIAR = "quedó firmada, pero no se pudo enviar al SII. Ábrela y usa «Enviar al SII».";

/**
 * Tras emitir, el documento se envía al SII de inmediato (decisión de Carlos del 11-nov-2026, como en OPAI 1). Va
 * después de la emisión y no dentro de ella: la emisión ya quedó guardada con su folio, así que un envío fallido no
 * la deshace; el documento queda «Firmada, sin enviar al SII» y se reintenta con el botón de la ficha.
 */
export async function enviarAlSiiTrasEmitir(ejecutar: Ejecutar, documentoId: string, nombre: string): Promise<boolean> {
  const r = await ejecutar("finanzas.ventas.enviar_sii", { documentoId });
  if (r) avisar.exito(`${nombre} emitida y enviada al SII`);
  else avisar.error(`${nombre} ${SIN_ENVIAR}`);
  return Boolean(r);
}

/** Lo mismo para la emisión en lote: una por una, y cuenta las que no se pudieron enviar. */
export async function enviarLoteAlSii(ejecutar: Ejecutar, documentoIds: readonly string[]): Promise<void> {
  let fallidas = 0;
  for (const documentoId of documentoIds) {
    if (!(await ejecutar("finanzas.ventas.enviar_sii", { documentoId }))) fallidas += 1;
  }
  const n = documentoIds.length;
  const plural = n === 1 ? "" : "s";
  if (fallidas === 0) avisar.exito(`${n} documento${plural} emitido${plural} y enviado${plural} al SII`);
  else avisar.error(`${n} emitido${plural}; ${fallidas} sin enviar al SII. Ábrelos en Ventas y usa «Enviar al SII».`);
}

/** Texto C3 / reglas N6 para la ficha en `en_aprobacion`. */
export function textoAprobacionMargenN6(p: {
  autoaprobacionMargen: boolean | null | undefined;
  puedeAprobarMargen: boolean;
  motivoNoAprobarMargen: string | null | undefined;
}): { titulo: string; detalle: string } {
  if (p.motivoNoAprobarMargen) {
    return { titulo: "Pendiente de aprobación de margen", detalle: p.motivoNoAprobarMargen };
  }
  if (p.puedeAprobarMargen && p.autoaprobacionMargen) {
    return {
      titulo: "Pendiente de aprobación de margen",
      detalle:
        "Eres owner y esta cotización es tuya: al aprobar se registrará autoaprobación en auditoría y quedará lista para enviar.",
    };
  }
  if (p.puedeAprobarMargen) {
    return {
      titulo: "Pendiente de aprobación de margen",
      detalle: "Aprueba o rechaza el margen; si apruebas, la cotización queda lista para enviar al contacto.",
    };
  }
  return {
    titulo: "Pendiente de aprobación de margen",
    detalle: "Un owner o admin revisará el margen antes de que se pueda enviar.",
  };
}

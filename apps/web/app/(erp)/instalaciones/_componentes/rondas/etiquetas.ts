import type { Gravedad, ModoPunto, OrdenPlantilla } from "@opai/domain";

/** Etiquetas visibles de los enumerados de Rondas (el código usa vocabulario genérico, Brief 01). */
export const MODO_PUNTO: Record<ModoPunto, string> = {
  qr: "QR",
  gps: "GPS",
  qr_gps: "QR + GPS",
};

export const ORDEN_PLANTILLA: Record<OrdenPlantilla, string> = {
  sugerido: "Sugerido",
  estricto: "Estricto",
  aleatorio: "Aleatorio por ejecución",
};

export const GRAVEDAD: Record<Gravedad, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

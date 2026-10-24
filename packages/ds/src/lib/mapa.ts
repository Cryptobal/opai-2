/** Geometría del mapa estático (Google Static Maps, Web Mercator): escala de metros a pixeles. */

const METROS_POR_PIXEL_EN_ZOOM_0 = 156_543.03392;
export const ANCHO_MAPA_PX = 640;
export const ZOOM_MAPA = 16;
const ZOOM_MIN = 12;
const ZOOM_MAX = 17;
/** Fracción del ancho que puede ocupar el círculo de la geocerca. */
const OCUPA_MAX = 0.5; // respecto del ancho: el mapa es 16:9, así que el círculo cabe también a lo alto

/** Metros que cubre un pixel lógico (sin `scale`) a esa latitud y zoom. */
export function metrosPorPixel(lat: number, zoom: number): number {
  return (METROS_POR_PIXEL_EN_ZOOM_0 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

/** Zoom con el que el círculo de la geocerca cabe en el mapa (16 si no hay geocerca). */
export function zoomParaGeocerca(lat: number, radioM?: number | null): number {
  if (!radioM || radioM <= 0) return ZOOM_MAPA;
  for (let z = ZOOM_MAX; z > ZOOM_MIN; z--) {
    if ((2 * radioM) / metrosPorPixel(lat, z) <= ANCHO_MAPA_PX * OCUPA_MAX) return z;
  }
  return ZOOM_MIN;
}

/** Diámetro del círculo de la geocerca como % del ancho del mapa, para dibujarlo sobre la imagen. */
export function diametroGeocercaPct(lat: number, zoom: number, radioM: number): number {
  const pct = ((2 * radioM) / metrosPorPixel(lat, zoom) / ANCHO_MAPA_PX) * 100;
  return Math.min(100, Math.max(4, Math.round(pct * 10) / 10));
}

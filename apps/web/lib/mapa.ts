/** Punto del mapa pedido al proxy `/api/geo/mapa`: coordenadas en grados y zoom de Static Maps. */
export type PuntoMapa = { lat: number; lng: number; zoom: number };

const DECIMAL = /^-?\d{1,3}(\.\d{1,8})?$/;
const ZOOM_POR_DEFECTO = 16;

/** Coordenadas a 5 decimales (~1 m): peticiones iguales comparten el caché del navegador. */
const aCincoDecimales = (n: number) => Math.round(n * 1e5) / 1e5;

/** URL del proxy del núcleo para la imagen del mapa: la clave de Google nunca llega al navegador. */
export function urlMapaOpai({ lat, lng, zoom }: PuntoMapa): string {
  const q = new URLSearchParams({
    lat: String(aCincoDecimales(lat)),
    lng: String(aCincoDecimales(lng)),
    z: String(zoom),
  });
  return `/api/geo/mapa?${q.toString()}`;
}

/** Lee y valida los parámetros del proxy; `null` si falta alguno o está fuera de rango. */
export function leerPuntoMapa(url: URL): PuntoMapa | null {
  const lat = url.searchParams.get("lat") ?? "";
  const lng = url.searchParams.get("lng") ?? "";
  const z = url.searchParams.get("z") ?? String(ZOOM_POR_DEFECTO);
  if (!DECIMAL.test(lat) || !DECIMAL.test(lng) || !/^\d{1,2}$/.test(z)) return null;
  const punto = { lat: Number(lat), lng: Number(lng), zoom: Number(z) };
  const valido =
    Math.abs(punto.lat) <= 90 && Math.abs(punto.lng) <= 180 && punto.zoom >= 10 && punto.zoom <= 18;
  return valido
    ? { ...punto, lat: aCincoDecimales(punto.lat), lng: aCincoDecimales(punto.lng) }
    : null;
}

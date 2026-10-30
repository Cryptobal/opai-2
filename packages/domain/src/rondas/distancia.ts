import type { Coordenada } from "./tipos";

const RADIO_TIERRA_M = 6_371_000;

/** Distancia en metros entre dos coordenadas (haversine, radio medio terrestre). */
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
}

/** Coordenada si ambos valores existen y son válidos; si no, null. */
export function coordenada(
  lat: number | null | undefined,
  lng: number | null | undefined,
): Coordenada | null {
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// Distancia entre dos puntos para el kilometraje (CAR-194): Google Routes API y, si falla o no hay
// ruta, línea recta (haversine). Nunca devuelve 0 silencioso entre puntos distintos.

export type Punto = { lat: number; lng: number };
export type OrigenDistancia = "google" | "linea_recta";
/** `km` con 1 decimal. `origenDistancia` dice si es por ruta (Google) o en línea recta (subestima). */
export type Distancia = { km: number; origenDistancia: OrigenDistancia };

const RADIO_TIERRA_KM = 6371.0088;
const rad = (g: number) => (g * Math.PI) / 180;
const aDecimas = (km: number) => Math.round(km * 10) / 10;

/** Valida coordenadas: finitas y dentro de rango. */
export function puntoValido(p: Punto): boolean {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
}

/** Km en línea recta (haversine), con 1 decimal; puntos distintos nunca dan 0 (mínimo 0,1). */
export function distanciaLineaRecta(a: Punto, b: Punto): Distancia {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const km = 2 * RADIO_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
  const distintos = a.lat !== b.lat || a.lng !== b.lng;
  return { km: distintos ? Math.max(0.1, aDecimas(km)) : 0, origenDistancia: "linea_recta" };
}

export const URL_ROUTES = "https://routes.googleapis.com/directions/v2:computeRoutes";

/** Cuerpo de Routes API: auto, sin tráfico (resultado estable) y región Chile. */
export function cuerpoRoutes(o: Punto, d: Punto) {
  const lugar = (p: Punto) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
  return {
    origin: lugar(o),
    destination: lugar(d),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_UNAWARE",
    regionCode: "CL",
    units: "METRIC",
  };
}

/** Km de la respuesta de Routes API, o null si no trae una ruta con distancia. */
export function kmDeRoutes(respuesta: { routes?: { distanceMeters?: number }[] }): number | null {
  const m = respuesta.routes?.[0]?.distanceMeters;
  return typeof m === "number" && Number.isFinite(m) && m > 0 ? Math.max(0.1, aDecimas(m / 1000)) : null;
}

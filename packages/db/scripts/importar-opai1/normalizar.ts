// Normalizaciones puras de la importación desde 1.0. RUT y teléfono reutilizan `@opai/domain`.
import { normalizarRut, normalizarTelefono } from "@opai/domain";

/** Texto recortado; vacío → null. */
export function textoLimpio(entrada: string | null | undefined): string | null {
  const t = entrada?.replace(/\s+/g, " ").trim() ?? "";
  return t === "" ? null : t;
}

/** RUT canónico "76543210-K" o null (vacío o DV inválido). */
export function rut(entrada: string | null | undefined): string | null {
  return entrada ? normalizarRut(entrada) : null;
}

/** Correo en minúsculas y sin espacios, o null si no tiene forma de correo. */
export function correo(entrada: string | null | undefined): string | null {
  const c = (entrada ?? "").replace(/\s+/g, "").toLowerCase();
  return /^[^@]+@[^@]+\.[^@]+$/.test(c) ? c : null;
}

/** Teléfono de Chile en E.164 o null. */
export function telefono(entrada: string | null | undefined): string | null {
  return entrada ? normalizarTelefono(entrada) : null;
}

const SUFIJOS_LEGALES = new Set([
  "spa",
  "ltda",
  "limitada",
  "sa",
  "eirl",
  "cia",
  "y",
  "s",
  "p",
  "a",
]);

/**
 * Nombre canónico para proponer fusiones: sin tildes, minúsculas, sin puntuación y sin sufijos
 * societarios al final ("Comercial Ñuble S.A." → "comercial nuble"). No identifica: solo sugiere.
 */
export function nombreCanonico(entrada: string): string {
  const palabras = entrada
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  while (palabras.length > 1 && SUFIJOS_LEGALES.has(palabras[palabras.length - 1] ?? "")) {
    palabras.pop();
  }
  return palabras.join(" ");
}

export type Punto = { lat: number; lng: number };

/** Distancia en metros entre dos puntos (haversine, radio medio terrestre). */
export function distanciaMetros(a: Punto, b: Punto): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** Punto si ambas coordenadas existen. */
export function punto(
  lat: number | null | undefined,
  lng: number | null | undefined,
): Punto | null {
  return lat == null || lng == null ? null : { lat, lng };
}

/** Umbral de la extracción (§6): dos instalaciones de la misma cuenta a menos de 50 m son la misma. */
export const UMBRAL_MISMA_UBICACION_M = 50;

const SANTIAGO = { lat: -33.4489, lng: -70.6693 } as const;

export function redondearCoord(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

export function coordsDeTexto(lat: string, lng: string): { lat: number; lng: number } | null {
  const a = Number.parseFloat(lat.trim());
  const b = Number.parseFloat(lng.trim());
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { lat: redondearCoord(a), lng: redondearCoord(b) };
}

export type CentroMapa = { lat: number; lng: number; etiqueta: string };

/** Prioriza coordenadas guardadas; si no hay, Santiago con el nombre de la instalación. */
export function centroInstalacion(
  nombre: string,
  lat: number | null,
  lng: number | null,
): CentroMapa {
  if (lat != null && lng != null) return { lat, lng, etiqueta: nombre };
  return { ...SANTIAGO, etiqueta: nombre };
}

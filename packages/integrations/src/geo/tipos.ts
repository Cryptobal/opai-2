// Tipos y normalización de direcciones de la geolocalización del núcleo (ADR-027).

export type DireccionGeo = {
  placeId: string | null;
  direccionFormateada: string;
  calle: string | null;
  comuna: string | null;
  region: string | null;
  pais: string | null;
  lat: number | null;
  lng: number | null;
};

export type Sugerencia = { placeId: string; texto: string; secundario: string | null };

export interface Geo {
  autocompletar(texto: string, sesion?: string): Promise<Sugerencia[]>;
  detalle(placeId: string, sesion?: string): Promise<DireccionGeo | null>;
  geocodificar(direccion: string): Promise<DireccionGeo | null>;
  /** URL de Static Maps con la clave: solo para el proxy del servidor, nunca para el cliente. */
  urlMapa(
    lat: number,
    lng: number,
    opciones?: { ancho?: number; alto?: number; zoom?: number },
  ): string;
}

export type Componente = { longText?: string; long_name?: string; types: string[] };

export function componentes(lista: Componente[] = []) {
  const de = (tipo: string) => {
    const c = lista.find((x) => x.types.includes(tipo));
    return c ? (c.longText ?? c.long_name ?? null) : null;
  };
  const calle = [de("route"), de("street_number")].filter(Boolean).join(" ") || null;
  return {
    calle,
    comuna: de("administrative_area_level_3") ?? de("locality"),
    region: de("administrative_area_level_1"),
    pais: de("country"),
  };
}

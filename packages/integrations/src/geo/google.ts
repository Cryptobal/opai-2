// Geolocalización del núcleo (ADR-027) sobre Google Maps Platform por HTTP, sin SDK. La clave nunca
// llega al navegador: autocompletado y geocodificación corren en el servidor y el mapa estático se
// sirve por un proxy del núcleo.

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

type Componente = { longText?: string; long_name?: string; types: string[] };

function componentes(lista: Componente[] = []) {
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

async function json<T>(r: Response, que: string): Promise<T> {
  if (!r.ok) throw new Error(`Google Maps respondió ${r.status} (${que}).`);
  return (await r.json()) as T;
}

export function geoGoogle(apiKey: string): Geo {
  const cabeceras = { "X-Goog-Api-Key": apiKey, "Content-Type": "application/json" };
  return {
    async autocompletar(texto, sesion) {
      const r = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: cabeceras,
        body: JSON.stringify({
          input: texto,
          languageCode: "es",
          includedRegionCodes: ["cl"],
          ...(sesion ? { sessionToken: sesion } : {}),
        }),
      });
      type R = {
        suggestions?: {
          placePrediction?: {
            placeId: string;
            text?: { text: string };
            structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
          };
        }[];
      };
      const d = await json<R>(r, "autocompletar");
      return (d.suggestions ?? []).flatMap((s) => {
        const p = s.placePrediction;
        if (!p) return [];
        return [
          {
            placeId: p.placeId,
            texto: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
            secundario: p.structuredFormat?.secondaryText?.text ?? null,
          },
        ];
      });
    },
    async detalle(placeId, sesion) {
      const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
      url.searchParams.set("languageCode", "es");
      if (sesion) url.searchParams.set("sessionToken", sesion);
      const r = await fetch(url, {
        headers: {
          ...cabeceras,
          "X-Goog-FieldMask": "id,formattedAddress,location,addressComponents",
        },
      });
      if (r.status === 404) return null;
      type R = {
        id: string;
        formattedAddress: string;
        location?: { latitude: number; longitude: number };
        addressComponents?: Componente[];
      };
      const d = await json<R>(r, "detalle");
      return {
        placeId: d.id,
        direccionFormateada: d.formattedAddress,
        ...componentes(d.addressComponents),
        lat: d.location?.latitude ?? null,
        lng: d.location?.longitude ?? null,
      };
    },
    async geocodificar(direccion) {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.search = new URLSearchParams({
        address: direccion,
        key: apiKey,
        language: "es",
        region: "cl",
      }).toString();
      type R = {
        status: string;
        results: {
          place_id: string;
          formatted_address: string;
          geometry: { location: { lat: number; lng: number } };
          address_components: Componente[];
        }[];
      };
      const d = await json<R>(await fetch(url), "geocodificar");
      const p = d.results[0];
      if (d.status !== "OK" || !p) return null;
      return {
        placeId: p.place_id,
        direccionFormateada: p.formatted_address,
        ...componentes(p.address_components),
        lat: p.geometry.location.lat,
        lng: p.geometry.location.lng,
      };
    },
    urlMapa(lat, lng, o = {}) {
      const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
      url.search = new URLSearchParams({
        center: `${lat},${lng}`,
        zoom: String(o.zoom ?? 16),
        size: `${o.ancho ?? 640}x${o.alto ?? 360}`,
        scale: "2",
        markers: `${lat},${lng}`,
        key: apiKey,
      }).toString();
      return url.toString();
    },
  };
}

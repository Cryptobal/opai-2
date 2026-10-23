// Geolocalización del núcleo (ADR-027) sobre Google Maps Platform por HTTP, sin SDK. La clave nunca
// llega al navegador: autocompletado y geocodificación corren en el servidor y el mapa estático se
// sirve por un proxy del núcleo. Toda falla de Google se informa con su estado y mensaje (sin la
// clave) en `ErrorGoogle` y en el log del servidor.

import { errorDeRespuesta, fallaDeGoogle } from "./error-google";
import { type Componente, componentes, type Geo } from "./tipos";

export { ErrorGoogle } from "./error-google";
export type { DireccionGeo, Geo, Sugerencia } from "./tipos";

export function geoGoogle(apiKey: string): Geo {
  const cabeceras = { "X-Goog-Api-Key": apiKey, "Content-Type": "application/json" };
  const json = async <T>(r: Response, api: string): Promise<T> => {
    if (!r.ok) throw await errorDeRespuesta(r, api, apiKey);
    return (await r.json()) as T;
  };
  /** `fetch` que convierte una caída de red en `ErrorGoogle` (sin la URL, que lleva la clave). */
  const llamar = async (api: string, url: string | URL, init?: RequestInit) => {
    try {
      return await fetch(url, init);
    } catch (e) {
      throw fallaDeGoogle(apiKey, api, 0, null, e instanceof Error ? e.message : "Sin respuesta.");
    }
  };
  return {
    async autocompletar(texto, sesion) {
      const r = await llamar(
        "Places autocompletar",
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST",
          headers: cabeceras,
          body: JSON.stringify({
            input: texto,
            languageCode: "es",
            includedRegionCodes: ["cl"],
            ...(sesion ? { sessionToken: sesion } : {}),
          }),
        },
      );
      type R = {
        suggestions?: {
          placePrediction?: {
            placeId: string;
            text?: { text: string };
            structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
          };
        }[];
      };
      const d = await json<R>(r, "Places autocompletar");
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
      const r = await llamar("Places detalle", url, {
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
      const d = await json<R>(r, "Places detalle");
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
        error_message?: string;
        results: {
          place_id: string;
          formatted_address: string;
          geometry: { location: { lat: number; lng: number } };
          address_components: Componente[];
        }[];
      };
      const d = await json<R>(await llamar("Geocoding", url), "Geocoding");
      // Geocoding responde 200 aunque la clave no sirva: el motivo viene en `status`.
      if (d.status !== "OK" && d.status !== "ZERO_RESULTS") {
        throw fallaDeGoogle(apiKey, "Geocoding", 200, d.status, d.error_message ?? "");
      }
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

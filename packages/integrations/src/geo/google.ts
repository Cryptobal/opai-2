// Geolocalización del núcleo (ADR-027) sobre Google Maps Platform por HTTP, sin SDK. La clave nunca
// llega al navegador: autocompletado y geocodificación corren en el servidor y el mapa estático se
// sirve por un proxy del núcleo. Toda falla de Google se informa con su estado y mensaje (sin la
// clave) en `ErrorGoogle` y en el log del servidor.

import { cuerpoRoutes, distanciaLineaRecta, kmDeRoutes, URL_ROUTES } from "./distancia";
import { ErrorGoogle, errorDeRespuesta, fallaDeGoogle } from "./error-google";
import { imagenDeRespuesta, urlMapaGoogle } from "./mapa";
import { type Componente, componentes, type Geo } from "./tipos";

export { distanciaLineaRecta, puntoValido } from "./distancia";
export type { Distancia, OrigenDistancia, Punto } from "./distancia";
export { ErrorGoogle } from "./error-google";
export type { ImagenMapa, OpcionesMapa } from "./mapa";
export type { DireccionGeo, Geo, Sugerencia } from "./tipos";
export { variantesDeBusqueda } from "./variantes";

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
    urlMapa: (lat, lng, o) => urlMapaGoogle(apiKey, lat, lng, o),
    async mapa(lat, lng, o) {
      const r = await llamar("Static Maps", urlMapaGoogle(apiKey, lat, lng, o));
      if (!r.ok) throw await errorDeRespuesta(r, "Static Maps", apiKey);
      return imagenDeRespuesta(r);
    },
    async distancia(origen, destino) {
      try {
        const r = await llamar("Routes", URL_ROUTES, {
          method: "POST",
          headers: { ...cabeceras, "X-Goog-FieldMask": "routes.distanceMeters" },
          body: JSON.stringify(cuerpoRoutes(origen, destino)),
        });
        const km = kmDeRoutes(await json<{ routes?: { distanceMeters?: number }[] }>(r, "Routes"));
        if (km !== null) return { km, origenDistancia: "google" as const };
      } catch (e) {
        // La falla ya quedó en el log (sin clave): se cae a línea recta y se informa el origen.
        if (!(e instanceof ErrorGoogle)) throw e;
      }
      return distanciaLineaRecta(origen, destino);
    },
  };
}

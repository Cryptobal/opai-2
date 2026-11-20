import { accesoGeo, falloGeo, LIMITES } from "@/lib/geo-ruta";
import { leerPuntoMapa } from "@/lib/mapa";
import { ejecutarComoUsuario } from "@/lib/servidor";

const PORTALES_CON_MAPA = ["erp", "supervisor"] as const;

/**
 * Proxy de la imagen del mapa (ADR-027): el navegador pide `/api/geo/mapa?lat&lng&z` desde una
 * `<img>`; aquí se verifica la sesión, se ejecuta `core.geo.mapa` (que usa la clave del tenant o de
 * la plataforma y mide `geo.mapa`) y se devuelve la imagen con caché privado de un día. La clave
 * de Google nunca sale del servidor.
 */
export async function GET(req: Request): Promise<Response> {
  const acceso = await accesoGeo({
    prefijoLimite: "geo-mapa",
    maximo: LIMITES.geoMapa.maximo,
    portales: PORTALES_CON_MAPA,
  });
  if (acceso instanceof Response) return acceso;
  const punto = leerPuntoMapa(new URL(req.url));
  if (!punto) return falloGeo(400, "Coordenadas o zoom inválidos.");
  const r = await ejecutarComoUsuario<{ mime: string; base64: string }>(acceso.portal, "core.geo.mapa", {
    lat: punto.lat,
    lng: punto.lng,
    zoom: punto.zoom,
  });
  if (!r.ok) {
    const estado =
      r.error.code === "UNPROCESSABLE" ? 503 : r.error.code === "FORBIDDEN" ? 403 : 502;
    return falloGeo(estado, r.error.message);
  }
  return new Response(new Uint8Array(Buffer.from(r.data.base64, "base64")), {
    headers: {
      "content-type": r.data.mime,
      "cache-control": "private, max-age=86400, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
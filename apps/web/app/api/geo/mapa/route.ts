import { leerPuntoMapa } from "@/lib/mapa";
import { LIMITES, permitir } from "@/lib/rate-limit";
import { demasiadas, noAutenticado } from "@/lib/respuestas";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

const PORTALES_CON_MAPA = ["erp", "supervisor"] as const;

const fallo = (status: number, message: string) =>
  Response.json({ ok: false, error: { message } }, { status });

/**
 * Proxy de la imagen del mapa (ADR-027): el navegador pide `/api/geo/mapa?lat&lng&z` desde una
 * `<img>`; aquí se verifica la sesión, se ejecuta `core.geo.mapa` (que usa la clave del tenant o de
 * la plataforma y mide `geo.mapa`) y se devuelve la imagen con caché privado de un día. La clave
 * de Google nunca sale del servidor.
 */
export async function GET(req: Request): Promise<Response> {
  const identidad = await identidadActual();
  if (!identidad?.actual) return noAutenticado();
  if (!(await permitir(`geo-mapa:${identidad.usuario.id}`, LIMITES.geoMapa.maximo)))
    return demasiadas();
  const punto = leerPuntoMapa(new URL(req.url));
  if (!punto) return fallo(400, "Coordenadas o zoom inválidos.");
  const portal = PORTALES_CON_MAPA.find((p) => identidad.actual?.portales.includes(p));
  if (!portal) return fallo(403, "Tu acceso no incluye mapas.");
  const r = await ejecutarComoUsuario<{ mime: string; base64: string }>(portal, "core.geo.mapa", {
    lat: punto.lat,
    lng: punto.lng,
    zoom: punto.zoom,
  });
  if (!r.ok) {
    const estado =
      r.error.code === "UNPROCESSABLE" ? 503 : r.error.code === "FORBIDDEN" ? 403 : 502;
    return fallo(estado, r.error.message);
  }
  return new Response(new Uint8Array(Buffer.from(r.data.base64, "base64")), {
    headers: {
      "content-type": r.data.mime,
      "cache-control": "private, max-age=86400, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

import { buscarEnNominatim } from "@/lib/mapa-osm/nominatim";
import { LIMITES, permitir } from "@/lib/rate-limit";
import { demasiadas, noAutenticado } from "@/lib/respuestas";
import { identidadActual } from "@/lib/servidor";

const PORTALES = ["erp", "supervisor", "trabajador"] as const;

const fallo = (status: number, message: string) =>
  Response.json({ ok: false, error: { message } }, { status });

/** Búsqueda de direcciones con Nominatim (OpenStreetMap), sin claves de pago. */
export async function GET(req: Request): Promise<Response> {
  const identidad = await identidadActual();
  if (!identidad?.actual) return noAutenticado();
  if (!(await permitir(`geo-buscar:${identidad.usuario.id}`, LIMITES.geoBuscar.maximo)))
    return demasiadas();
  const portal = PORTALES.find((p) => identidad.actual?.portales.includes(p));
  if (!portal) return fallo(403, "Tu acceso no incluye mapas.");
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return Response.json({ ok: true, data: [] as const });
  const data = await buscarEnNominatim(q);
  return Response.json(
    { ok: true, data },
    { headers: { "cache-control": "private, max-age=60" } },
  );
}
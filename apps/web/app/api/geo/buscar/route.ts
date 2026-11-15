import { accesoGeo, LIMITES } from "@/lib/geo-ruta";
import { buscarEnNominatim } from "@/lib/mapa-osm/nominatim";

/** Búsqueda de direcciones con Nominatim (OpenStreetMap), sin claves de pago. */
export async function GET(req: Request): Promise<Response> {
  const acceso = await accesoGeo({
    prefijoLimite: "geo-buscar",
    maximo: LIMITES.geoBuscar.maximo,
    portales: ["erp", "supervisor", "trabajador"],
  });
  if (acceso instanceof Response) return acceso;
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return Response.json({ ok: true, data: [] as const });
  const data = await buscarEnNominatim(q);
  return Response.json(
    { ok: true, data },
    { headers: { "cache-control": "private, max-age=60" } },
  );
}
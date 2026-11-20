import { centroInstalacion, type CentroMapa } from "@/lib/mapa-osm/coords";
import type { Instalacion } from "@/lib/tipos-maestros";

/** Usa coordenadas guardadas o el centro de referencia Santiago; nunca envía direcciones. */
export function centroMapaInstalacion(
  i: Pick<Instalacion, "nombre" | "lat" | "lng">,
): CentroMapa {
  return centroInstalacion(i.nombre, i.lat, i.lng);
}

import { centroInstalacion, textoDireccionInstalacion, type CentroMapa } from "@/lib/mapa-osm/coords";
import { geocodificarDireccion } from "@/lib/mapa-osm/nominatim";
import type { Instalacion } from "@/lib/tipos-maestros";

/** Centro del mapa de Rondas: coordenadas de la instalación, su dirección (Nominatim) o Santiago. */
export async function centroMapaInstalacion(
  i: Pick<Instalacion, "nombre" | "lat" | "lng" | "direccionFormateada" | "calle" | "comuna" | "region">,
): Promise<CentroMapa> {
  const texto = textoDireccionInstalacion(i);
  const resuelto = texto ? await geocodificarDireccion(texto) : null;
  return centroInstalacion(i.nombre, i.lat, i.lng, resuelto);
}
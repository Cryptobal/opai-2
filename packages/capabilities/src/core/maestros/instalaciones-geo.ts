import { geoDe } from "../../integraciones/adaptadores";
import type { Contexto } from "../../types";

type Direccion = {
  calle?: string | null | undefined;
  comuna?: string | null | undefined;
  region?: string | null | undefined;
  placeId?: string | null | undefined;
  lat?: number | null | undefined;
  lng?: number | null | undefined;
};

export type Ubicacion = {
  datos: {
    direccionFormateada?: string;
    placeId?: string | null;
    lat?: number | null;
    lng?: number | null;
    comuna?: string | null;
    region?: string | null;
  };
  avisos: string[];
};

/**
 * Si llega una dirección sin coordenadas, la geocodifica con el servicio del núcleo (medido).
 * Si falla o no hay geolocalización, la instalación se guarda igual y se informa (Brief 02).
 * En vista previa no se llama al proveedor (no se cobra por mirar).
 */
export async function ubicar(ctx: Contexto, d: Direccion, dryRun: boolean): Promise<Ubicacion> {
  const tieneCoordenadas = d.lat != null && d.lng != null;
  const texto = [d.calle, d.comuna, d.region].filter(Boolean).join(", ");
  if (tieneCoordenadas || !d.calle || dryRun) return { datos: {}, avisos: [] };
  try {
    const geo = await geoDe(ctx);
    if (!geo)
      return { datos: {}, avisos: ["Sin geolocalización configurada: se guardó sin coordenadas."] };
    const r = d.placeId ? await geo.detalle(d.placeId) : await geo.geocodificar(`${texto}, Chile`);
    if (!r || r.lat === null || r.lng === null) {
      return {
        datos: {},
        avisos: ["No encontramos la dirección en el mapa: se guardó sin coordenadas."],
      };
    }
    return {
      datos: {
        direccionFormateada: r.direccionFormateada,
        placeId: r.placeId,
        lat: r.lat,
        lng: r.lng,
        comuna: d.comuna ?? r.comuna,
        region: d.region ?? r.region,
      },
      avisos: [],
    };
  } catch {
    return { datos: {}, avisos: ["La geolocalización no respondió: se guardó sin coordenadas."] };
  }
}

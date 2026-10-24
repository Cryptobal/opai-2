import { MapaEstatico } from "@opai/ds";

import { urlMapaOpai } from "@/lib/mapa";

type Props = Omit<Parameters<typeof MapaEstatico>[0], "fuente">;

/** `MapaEstatico` con la imagen real del servicio de mapas del núcleo (`/api/geo/mapa`). */
export function MapaOpai(props: Props) {
  return <MapaEstatico {...props} fuente={urlMapaOpai} />;
}

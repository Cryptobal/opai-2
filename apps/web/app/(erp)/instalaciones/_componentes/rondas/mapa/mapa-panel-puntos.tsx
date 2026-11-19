"use client";

import "./estilos-leaflet.css";

import { useMemo } from "react";
import { MapContainer, Marker, Popup } from "react-leaflet";

import { cn } from "@opai/ds";

import type { CentroMapa } from "@/lib/mapa-osm/coords";
import { EncuadrePuntos } from "@/lib/mapa-osm/marcadores-leaflet";

import { puntoConGps } from "../etiquetas";
import type { Punto } from "../tipos";
import { iconoInstalacion } from "./iconos";
import { MapaCapaBase } from "./mapa-capa";
import { MarcadoresPanelPuntos } from "./mapa-panel-marcadores";

type Props = {
  centro: CentroMapa;
  puntos: readonly Punto[];
  defectosRadioM: number;
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
  vacio: boolean;
};

/** Vista de todos los puntos GPS de la instalación, numerados como en la lista. */
export function MapaPanelPuntos({ centro, puntos, defectosRadioM, seleccionadoId, onSeleccionar, vacio }: Props) {
  const gps = useMemo(
    () =>
      puntos
        .map((p, i) => ({ p, n: i + 1 }))
        .filter(({ p }) => puntoConGps(p.modo) && p.latitud != null && p.longitud != null),
    [puntos],
  );
  const coords = gps.map(({ p }) => ({ lat: p.latitud!, lng: p.longitud! }));
  return (
    <div
      className={cn("ds-mapa-leaflet relative min-h-48 overflow-hidden rounded-md border border-border", {
        "aspect-video": !vacio,
        "aspect-[21/9] sm:aspect-video": vacio,
      })}
      role="region"
      aria-label="Mapa de puntos de la ronda"
    >
      <MapContainer center={[centro.lat, centro.lng]} zoom={15} className="size-full min-h-48" scrollWheelZoom>
        <MapaCapaBase />
        <EncuadrePuntos centro={centro} marcados={coords} />
        <Marker position={[centro.lat, centro.lng]} icon={iconoInstalacion()}>
          <Popup>{centro.etiqueta}</Popup>
        </Marker>
        <MarcadoresPanelPuntos
          gps={gps}
          defectosRadioM={defectosRadioM}
          seleccionadoId={seleccionadoId}
          onSeleccionar={onSeleccionar}
        />
      </MapContainer>
      {vacio ? (
        <p className="pointer-events-none absolute inset-x-4 bottom-3 rounded-md bg-surface/90 px-3 py-2 text-center text-sm text-fg-muted shadow-sm">
          Aún no hay puntos GPS. Usa el mapa al crear el primero: abre «Nuevo punto» y elige GPS o QR + GPS.
        </p>
      ) : null}
    </div>
  );
}
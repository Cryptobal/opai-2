"use client";

import "./estilos-leaflet.css";

import { useCallback, useState } from "react";
import { MapContainer, Marker } from "react-leaflet";

import { cn } from "@opai/ds";

import { coordsDeTexto, redondearCoord, type CentroMapa } from "@/lib/mapa-osm/coords";
import { ClicMapa, VistaMapaPunto } from "@/lib/mapa-osm/marcadores-leaflet";

import { BuscarUbicacion } from "./buscar-ubicacion";
import { MarcadoresEdicionPunto } from "./mapa-edicion-marcadores";
import { iconoInstalacion } from "./iconos";
import { MapaCapaBase } from "./mapa-capa";

type Props = {
  centro: CentroMapa;
  latitud: string;
  longitud: string;
  radioM: number;
  onCoords: (lat: string, lng: string) => void;
};

/** Mapa interactivo del punto GPS: clic, arrastre, geocerca y búsqueda. */
export function MapaEdicionPunto({ centro, latitud, longitud, radioM, onCoords }: Props) {
  const punto = coordsDeTexto(latitud, longitud);
  const fijar = useCallback(
    (lat: number, lng: number) => {
      onCoords(String(redondearCoord(lat)), String(redondearCoord(lng)));
    },
    [onCoords],
  );
  const [buscandoGps, setBuscandoGps] = useState(false);
  const miUbicacion = () => {
    if (!navigator.geolocation) return;
    setBuscandoGps(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        fijar(p.coords.latitude, p.coords.longitude);
        setBuscandoGps(false);
      },
      () => setBuscandoGps(false),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  };
  return (
    <div className="flex flex-col gap-3">
      <BuscarUbicacion onElegir={fijar} onMiUbicacion={miUbicacion} buscandoGps={buscandoGps} />
      <div
        className={cn(
          "ds-mapa-leaflet relative aspect-video overflow-hidden rounded-md border border-border",
        )}
        role="region"
        aria-label="Mapa para ubicar el punto"
      >
        <MapContainer center={[centro.lat, centro.lng]} zoom={15} className="size-full" scrollWheelZoom>
          <MapaCapaBase />
          <VistaMapaPunto centro={centro} punto={punto} />
          <ClicMapa onClick={fijar} />
          <Marker position={[centro.lat, centro.lng]} icon={iconoInstalacion()} />
          {punto ? <MarcadoresEdicionPunto punto={punto} radioM={radioM} fijar={fijar} /> : null}
        </MapContainer>
        {!punto ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-fg-muted">
            Haz clic en el mapa para fijar el punto
          </p>
        ) : null}
      </div>
    </div>
  );
}
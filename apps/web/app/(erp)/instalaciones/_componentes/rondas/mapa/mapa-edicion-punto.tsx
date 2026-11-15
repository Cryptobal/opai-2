"use client";

import "./estilos-leaflet.css";

import { useCallback, useEffect, useState } from "react";
import { Circle, MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";

import { cn } from "@opai/ds";

import { coordsDeTexto, redondearCoord, type CentroMapa } from "@/lib/mapa-osm/coords";

import { BuscarUbicacion } from "./buscar-ubicacion";
import { iconoInstalacion, iconoPuntoEditable } from "./iconos";
import { MapaCapaBase } from "./mapa-capa";

type Props = {
  centro: CentroMapa;
  latitud: string;
  longitud: string;
  radioM: number;
  onCoords: (lat: string, lng: string) => void;
};

function SincronizarVista({ centro, punto }: { centro: CentroMapa; punto: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    map.setView(punto ? [punto.lat, punto.lng] : [centro.lat, centro.lng], punto ? 17 : 15);
  }, [centro.lat, centro.lng, map, punto]);
  return null;
}

function EventosMapa({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(redondearCoord(e.latlng.lat), redondearCoord(e.latlng.lng));
    },
  });
  return null;
}

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
          <SincronizarVista centro={centro} punto={punto} />
          <EventosMapa onClick={fijar} />
          <Marker position={[centro.lat, centro.lng]} icon={iconoInstalacion()} />
          {punto ? (
            <>
              <Marker
                position={[punto.lat, punto.lng]}
                icon={iconoPuntoEditable()}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    fijar(lat, lng);
                  },
                }}
              />
              <Circle
                center={[punto.lat, punto.lng]}
                radius={radioM}
                pathOptions={{
                  color: "var(--color-accent)",
                  fillColor: "var(--color-accent)",
                  fillOpacity: 0.12,
                }}
              />
            </>
          ) : null}
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
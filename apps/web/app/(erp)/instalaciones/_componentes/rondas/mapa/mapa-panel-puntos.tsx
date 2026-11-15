"use client";

import "./estilos-leaflet.css";

import { Fragment, useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, Popup, useMap } from "react-leaflet";

import { cn } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import type { CentroMapa } from "@/lib/mapa-osm/coords";

import type { Punto } from "../tipos";
import { iconoInstalacion, iconoNumero } from "./iconos";
import { MapaCapaBase } from "./mapa-capa";

const conGps = (m: Punto["modo"]) => m === "gps" || m === "qr_gps";

type Props = {
  centro: CentroMapa;
  puntos: readonly Punto[];
  defectosRadioM: number;
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
  vacio: boolean;
};

function AjustarBounds({
  centro,
  marcados,
}: {
  centro: CentroMapa;
  marcados: { lat: number; lng: number }[];
}) {
  const map = useMap();
  useEffect(() => {
    if (marcados.length === 0) {
      map.setView([centro.lat, centro.lng], 15);
      return;
    }
    const bounds = marcados.map((p) => [p.lat, p.lng] as [number, number]);
    bounds.push([centro.lat, centro.lng]);
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });
  }, [centro.lat, centro.lng, map, marcados]);
  return null;
}

/** Vista de todos los puntos GPS de la instalación, numerados como en la lista. */
export function MapaPanelPuntos({ centro, puntos, defectosRadioM, seleccionadoId, onSeleccionar, vacio }: Props) {
  const gps = useMemo(
    () =>
      puntos
        .map((p, i) => ({ p, n: i + 1 }))
        .filter(({ p }) => conGps(p.modo) && p.latitud != null && p.longitud != null),
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
        <AjustarBounds centro={centro} marcados={coords} />
        <Marker position={[centro.lat, centro.lng]} icon={iconoInstalacion()}>
          <Popup>{centro.etiqueta}</Popup>
        </Marker>
        {gps.map(({ p, n }) => {
          const lat = p.latitud!;
          const lng = p.longitud!;
          const radio = p.radioM ?? defectosRadioM;
          return (
            <Fragment key={p.id}>
              <Marker
                position={[lat, lng]}
                icon={iconoNumero(n, seleccionadoId === p.id)}
                eventHandlers={{ click: () => onSeleccionar(p.id) }}
              >
                <Popup>
                  <span className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">{p.nombre}</span>
                    <LinkNext href={`?punto=${p.id}`} className="text-accent underline">
                      Editar punto
                    </LinkNext>
                  </span>
                </Popup>
              </Marker>
              <Circle
                center={[lat, lng]}
                radius={radio}
                pathOptions={{
                  color: seleccionadoId === p.id ? "var(--color-fg)" : "var(--color-accent)",
                  fillColor: "var(--color-accent)",
                  fillOpacity: seleccionadoId === p.id ? 0.18 : 0.1,
                }}
              />
            </Fragment>
          );
        })}
      </MapContainer>
      {vacio ? (
        <p className="pointer-events-none absolute inset-x-4 bottom-3 rounded-md bg-surface/90 px-3 py-2 text-center text-sm text-fg-muted shadow-sm">
          Aún no hay puntos GPS. Usa el mapa al crear el primero: abre «Nuevo punto» y elige GPS o QR + GPS.
        </p>
      ) : null}
    </div>
  );
}
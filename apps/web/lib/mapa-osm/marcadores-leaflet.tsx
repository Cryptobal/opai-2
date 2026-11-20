"use client";

import { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

import { redondearCoord, type CentroMapa } from "./coords";

/** Recoloca el mapa al centro o al punto elegido. */
export function VistaMapaPunto({
  centro,
  punto,
}: {
  centro: CentroMapa;
  punto: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(punto ? [punto.lat, punto.lng] : [centro.lat, centro.lng], punto ? 17 : 15);
  }, [centro.lat, centro.lng, map, punto]);
  return null;
}

export function ClicMapa({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(redondearCoord(e.latlng.lat), redondearCoord(e.latlng.lng));
    },
  });
  return null;
}

/** Encuadra instalación y puntos GPS visibles. */
export function EncuadrePuntos({
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
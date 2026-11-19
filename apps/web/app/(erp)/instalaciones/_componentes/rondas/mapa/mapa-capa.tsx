"use client";

import { TileLayer } from "react-leaflet";

import { ATRIBUCION_OSM, urlCapaMapa } from "@/lib/mapa-osm/capas";
import { useTemaMapas } from "@/lib/mapa-osm/usar-tema-mapas";

/** Teselas OpenStreetMap / CARTO (oscuro) con la atribución requerida. */
export function MapaCapaBase() {
  const tema = useTemaMapas();
  return (
    <TileLayer
      attribution={tema === "dark" ? `${ATRIBUCION_OSM} · CARTO` : ATRIBUCION_OSM}
      url={urlCapaMapa(tema)}
    />
  );
}
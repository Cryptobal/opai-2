"use client";

import { LayersControl, TileLayer } from "react-leaflet";

import {
  ATRIBUCION_OSM,
  ATRIBUCION_SATELITE,
  urlCapaMapa,
  urlCapaSatelite,
} from "@/lib/mapa-osm/capas";
import { useTemaMapas } from "@/lib/mapa-osm/usar-tema-mapas";

const { BaseLayer } = LayersControl;

/** Teselas OSM / CARTO (oscuro) y satélite Esri, con selector de capa y atribución. */
export function MapaCapaBase() {
  const tema = useTemaMapas();
  return (
    <LayersControl position="topright">
      <BaseLayer checked name="Mapa">
        <TileLayer
          attribution={tema === "dark" ? `${ATRIBUCION_OSM} · CARTO` : ATRIBUCION_OSM}
          url={urlCapaMapa(tema)}
        />
      </BaseLayer>
      <BaseLayer name="Satélite">
        <TileLayer attribution={ATRIBUCION_SATELITE} url={urlCapaSatelite()} />
      </BaseLayer>
    </LayersControl>
  );
}
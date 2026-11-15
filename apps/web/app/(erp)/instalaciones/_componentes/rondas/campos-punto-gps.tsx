"use client";

import dynamic from "next/dynamic";

import type { CentroMapa } from "@/lib/mapa-osm/coords";

import { CamposCoordenadasPunto, CamposGeocercaPunto } from "./campos-punto-gps-campos";
import type { SetCampoPunto } from "./campos-punto-tipos";
import type { DatosPunto } from "./hoja-punto-datos";
import type { DefectosRondas } from "./tipos";

const MapaEdicionPunto = dynamic(
  () => import("./mapa/mapa-edicion-punto").then((m) => m.MapaEdicionPunto),
  {
    ssr: false,
    loading: () => <div className="aspect-video animate-pulse rounded-md border border-border bg-fill" />,
  },
);

/** Mapa, coordenadas y geocerca del punto (modo GPS o QR + GPS). */
export function CamposPuntoGps({
  d,
  set,
  defectos,
  centroInstalacion,
}: {
  d: DatosPunto;
  set: SetCampoPunto;
  defectos: DefectosRondas;
  centroInstalacion: CentroMapa;
}) {
  const radio = Number.parseInt(d.radioM, 10);
  const radioM = Number.isFinite(radio) && radio > 0 ? radio : defectos.radioM;
  return (
    <>
      <MapaEdicionPunto
        centro={centroInstalacion}
        latitud={d.latitud}
        longitud={d.longitud}
        radioM={radioM}
        onCoords={(lat, lng) => {
          set("latitud", lat);
          set("longitud", lng);
        }}
      />
      <CamposCoordenadasPunto d={d} set={set} />
      <CamposGeocercaPunto d={d} set={set} defectos={defectos} />
    </>
  );
}
"use client";

import type { Dispatch, SetStateAction } from "react";

import type { CentroMapa } from "@/lib/mapa-osm/coords";

import { CamposPuntoBase } from "./campos-punto-base";
import { CamposPuntoGps } from "./campos-punto-gps";
import { puntoConGps } from "./etiquetas";
import type { DatosPunto } from "./hoja-punto-datos";
import type { DefectosRondas } from "./tipos";

/** Campos del punto (c13pd) con la herencia del tenant visible: lo que se hereda se dice en la ayuda. */
export function CamposPunto({
  d,
  setD,
  defectos,
  centroInstalacion,
}: {
  d: DatosPunto;
  setD: Dispatch<SetStateAction<DatosPunto>>;
  defectos: DefectosRondas;
  centroInstalacion: CentroMapa;
}) {
  const set = <K extends keyof DatosPunto>(k: K, v: DatosPunto[K]) => setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="flex flex-col gap-4">
      <CamposPuntoBase d={d} set={set} defectos={defectos} />
      {puntoConGps(d.modo) ? (
        <CamposPuntoGps d={d} set={set} defectos={defectos} centroInstalacion={centroInstalacion} />
      ) : null}
    </div>
  );
}
"use client";

import dynamic from "next/dynamic";
import { Campo, Input, Switch } from "@opai/ds";
import { RADIO_GEOCERCA_M } from "@opai/domain";

import type { CentroMapa } from "@/lib/mapa-osm/coords";

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
type SetCampoPunto = <K extends keyof DatosPunto>(k: K, v: DatosPunto[K]) => void;

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
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Latitud" htmlFor="pt-lat">
          <Input
            id="pt-lat"
            value={d.latitud}
            inputMode="decimal"
            placeholder="-33.45"
            onChange={(e) => set("latitud", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Longitud" htmlFor="pt-lng">
          <Input
            id="pt-lng"
            value={d.longitud}
            inputMode="decimal"
            placeholder="-70.66"
            onChange={(e) => set("longitud", e.target.value)}
          />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo
          etiqueta="Radio (m)"
          htmlFor="pt-radio"
          ayuda={`Hereda ${defectos.radioM} m si lo dejas en blanco · máx. ${RADIO_GEOCERCA_M.max} m`}
        >
          <Input
            id="pt-radio"
            value={d.radioM}
            inputMode="numeric"
            placeholder={String(defectos.radioM)}
            onChange={(e) => set("radioM", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Precisión mín. (m)" htmlFor="pt-prec" ayuda={`Hereda ${defectos.precisionMinM} m`}>
          <Input
            id="pt-prec"
            value={d.precisionMinM}
            inputMode="numeric"
            placeholder={String(defectos.precisionMinM)}
            onChange={(e) => set("precisionMinM", e.target.value)}
          />
        </Campo>
      </div>
      <Switch
        activo={d.estricto}
        onCambiar={(v) => set("estricto", v)}
        etiqueta="Geocerca estricta"
        descripcion="Una marca QR fuera del radio se trata como anomalía."
      />
    </>
  );
}
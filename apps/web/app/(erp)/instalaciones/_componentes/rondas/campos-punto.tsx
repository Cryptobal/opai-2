"use client";

import type { Dispatch, SetStateAction } from "react";

import { Campo, Input, MapaEstatico, RadioGroup, Switch, Textarea } from "@opai/ds";
import { type ModoPunto, MODOS_PUNTO } from "@opai/domain";

import { MODO_PUNTO } from "./etiquetas";
import type { DatosPunto } from "./hoja-punto-datos";
import type { DefectosRondas } from "./tipos";

const conGps = (m: string) => m === "gps" || m === "qr_gps";

/** Campos del punto (c13pd) con la herencia del tenant visible: lo que se hereda se dice en la ayuda. */
export function CamposPunto({
  d,
  setD,
  defectos,
}: {
  d: DatosPunto;
  setD: Dispatch<SetStateAction<DatosPunto>>;
  defectos: DefectosRondas;
}) {
  const set = <K extends keyof DatosPunto>(k: K, v: DatosPunto[K]) => setD((x) => ({ ...x, [k]: v }));
  const gps = conGps(d.modo);
  const lat = Number(d.latitud);
  const lng = Number(d.longitud);
  const hayCoords = d.latitud !== "" && d.longitud !== "" && !Number.isNaN(lat) && !Number.isNaN(lng);
  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Nombre del punto" htmlFor="pt-nombre">
        <Input
          id="pt-nombre"
          value={d.nombre}
          placeholder="Portería principal"
          onChange={(e) => set("nombre", e.target.value)}
        />
      </Campo>
      <Campo etiqueta="Instrucción para el guardia" htmlFor="pt-instr">
        <Textarea
          id="pt-instr"
          value={d.instrucciones}
          rows={2}
          placeholder="Qué revisar en este punto"
          onChange={(e) => set("instrucciones", e.target.value)}
        />
      </Campo>
      <RadioGroup
        etiqueta="Modo de verificación"
        orientacion="fila"
        valor={d.modo}
        onCambiar={(v) => set("modo", v as ModoPunto)}
        opciones={MODOS_PUNTO.map((m) => ({ valor: m, etiqueta: MODO_PUNTO[m] }))}
      />
      <p className="t-caption -mt-2">Por defecto del tenant: {MODO_PUNTO[defectos.modo]}.</p>
      {gps ? (
        <>
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
          {hayCoords ? (
            <MapaEstatico lat={lat} lng={lng} geocercaM={Number(d.radioM) || defectos.radioM} pie="Geocerca del punto" />
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Radio (m)" htmlFor="pt-radio" ayuda={`Hereda ${defectos.radioM} m si lo dejas en blanco`}>
              <Input id="pt-radio" value={d.radioM} inputMode="numeric" placeholder={String(defectos.radioM)} onChange={(e) => set("radioM", e.target.value)} />
            </Campo>
            <Campo etiqueta="Precisión mín. (m)" htmlFor="pt-prec" ayuda={`Hereda ${defectos.precisionMinM} m`}>
              <Input id="pt-prec" value={d.precisionMinM} inputMode="numeric" placeholder={String(defectos.precisionMinM)} onChange={(e) => set("precisionMinM", e.target.value)} />
            </Campo>
          </div>
          <Switch
            activo={d.estricto}
            onCambiar={(v) => set("estricto", v)}
            etiqueta="Geocerca estricta"
            descripcion="Una marca QR fuera del radio se trata como anomalía."
          />
        </>
      ) : null}
      <Campo etiqueta="Permanencia (s)" htmlFor="pt-perm" ayuda={`Hereda ${defectos.permanenciaGpsS} s`}>
        <Input id="pt-perm" value={d.permanenciaS} inputMode="numeric" placeholder={String(defectos.permanenciaGpsS)} onChange={(e) => set("permanenciaS", e.target.value)} />
      </Campo>
      <Switch
        activo={d.exigeFoto}
        onCambiar={(v) => set("exigeFoto", v)}
        etiqueta="Pedir foto al marcar"
        descripcion="El guardia adjunta una foto al confirmar el punto."
      />
    </div>
  );
}

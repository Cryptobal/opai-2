"use client";

import type { Dispatch, SetStateAction } from "react";

import { Campo, Input, RadioGroup, Switch, Textarea } from "@opai/ds";
import { type ModoPunto, MODOS_PUNTO } from "@opai/domain";

import type { CentroMapa } from "@/lib/mapa-osm/coords";

import { CamposPuntoGps } from "./campos-punto-gps";
import { MODO_PUNTO, puntoConGps } from "./etiquetas";
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
  const gps = puntoConGps(d.modo);
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
      <p className="t-caption -mt-2">Por defecto en la empresa: {MODO_PUNTO[defectos.modo]}.</p>
      {gps ? (
        <CamposPuntoGps d={d} set={set} defectos={defectos} centroInstalacion={centroInstalacion} />
      ) : null}
      <Campo etiqueta="Permanencia (s)" htmlFor="pt-perm" ayuda={`Hereda ${defectos.permanenciaGpsS} s`}>
        <Input
          id="pt-perm"
          value={d.permanenciaS}
          inputMode="numeric"
          placeholder={String(defectos.permanenciaGpsS)}
          onChange={(e) => set("permanenciaS", e.target.value)}
        />
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
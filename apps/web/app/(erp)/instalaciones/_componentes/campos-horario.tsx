"use client";

import type { Dispatch, SetStateAction } from "react";

import { Alerta, Campo, Input, InputHora, Switch } from "@opai/ds";

import { conCambio, type DatosPuesto } from "./puesto-datos";

type Set = Dispatch<SetStateAction<DatosPuesto>>;

/** Tramos de horario (día y, si rota, noche), colación y horas semanales del puesto (Brief 11). */
export function CamposHorario({ d, setD }: { d: DatosPuesto; setD: Set }) {
  const set = <K extends keyof DatosPuesto>(k: K, v: DatosPuesto[K]) =>
    setD((x) => conCambio(x, k, v));
  const cruza = d.fin <= d.inicio;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Inicio" htmlFor="p-ini">
          <InputHora id="p-ini" valor={d.inicio} onCambiar={(v) => set("inicio", v)} />
        </Campo>
        <Campo etiqueta="Fin" htmlFor="p-fin">
          <InputHora id="p-fin" valor={d.fin} onCambiar={(v) => set("fin", v)} />
        </Campo>
      </div>
      {cruza ? (
        <Alerta tono="info" titulo="Cruza medianoche">
          El cruce de medianoche se calcula solo: termina el día siguiente a las {d.fin}.
        </Alerta>
      ) : null}
      <Switch
        etiqueta="Rotación día y noche"
        descripcion="Agrega un segundo tramo de noche al mismo puesto."
        activo={d.rota}
        onCambiar={(v) => set("rota", v)}
      />
      {d.rota ? (
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Inicio noche" htmlFor="p-ini-n">
            <InputHora id="p-ini-n" valor={d.inicioNoche} onCambiar={(v) => set("inicioNoche", v)} />
          </Campo>
          <Campo etiqueta="Fin noche" htmlFor="p-fin-n">
            <InputHora id="p-fin-n" valor={d.finNoche} onCambiar={(v) => set("finNoche", v)} />
          </Campo>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Colación (min)" htmlFor="p-col">
          <Input
            id="p-col"
            type="number"
            inputMode="numeric"
            min={0}
            max={240}
            value={d.colacion}
            onChange={(e) => set("colacion", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Horas semanales" htmlFor="p-horas">
          <Input
            id="p-horas"
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Se sugiere sola"
            value={d.horas}
            onChange={(e) => {
              const horas = e.target.value;
              setD((x) => ({ ...x, horas, horasTocadas: true }));
            }}
          />
        </Campo>
      </div>
      <Switch
        etiqueta="Colación fuera de la jornada"
        descripcion="Si está activa, la colación no se descuenta de las horas."
        activo={d.colacionFuera}
        onCambiar={(v) => set("colacionFuera", v)}
      />
    </div>
  );
}

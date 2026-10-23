"use client";

import { Campo, Input, InputFecha } from "@opai/ds";

import { type DatosCuenta, rutMalo } from "./campos-cuenta";

type Props = {
  d: DatosCuenta;
  set: <K extends keyof DatosCuenta>(k: K, v: DatosCuenta[K]) => void;
};

/** Representante legal y personería de la cuenta (05). */
export function CamposRepresentante({ d, set }: Props) {
  return (
    <fieldset className="flex flex-col gap-3.5">
      <legend className="mb-2 text-md font-semibold text-fg">Representante legal</legend>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Campo etiqueta="Nombre" htmlFor="c-rep">
          <Input
            id="c-rep"
            value={d.representante.nombre}
            onChange={(e) => set("representante", { ...d.representante, nombre: e.target.value })}
          />
        </Campo>
        <Campo
          etiqueta="RUT"
          htmlFor="c-rep-rut"
          {...(rutMalo(d.representante.rut) ? { error: "RUT inválido" } : {})}
        >
          <Input
            id="c-rep-rut"
            className="t-mono"
            value={d.representante.rut}
            onChange={(e) => set("representante", { ...d.representante, rut: e.target.value })}
          />
        </Campo>
        <Campo etiqueta="Fecha de la escritura" htmlFor="c-esc">
          <InputFecha
            id="c-esc"
            valor={d.escrituraFecha}
            onCambiar={(v) => set("escrituraFecha", v)}
          />
        </Campo>
        <Campo etiqueta="Notaría" htmlFor="c-not">
          <Input
            id="c-not"
            value={d.escrituraNotaria}
            onChange={(e) => set("escrituraNotaria", e.target.value)}
          />
        </Campo>
      </div>
    </fieldset>
  );
}

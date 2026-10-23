"use client";

import { Info } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { Campo, Combobox, Input, InputFecha, InputHora, RadioGroup, Select } from "@opai/ds";

import { type DatosPuesto, PATRONES } from "./puesto-datos";

export { type DatosPuesto, inicialPuesto, puestoAInput } from "./puesto-datos";

type Props = {
  d: DatosPuesto;
  setD: Dispatch<SetStateAction<DatosPuesto>>;
  cargos: { valor: string; etiqueta: string }[];
};

/** Nuevo puesto (09): nombre, cargo, patrón, horario con cruce de medianoche, jornada y dotación. */
export function CamposPuesto({ d, setD, cargos }: Props) {
  const set = <K extends keyof DatosPuesto>(k: K, v: DatosPuesto[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  const cruza = d.fin <= d.inicio;
  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Nombre del puesto" htmlFor="p-nombre">
        <Input
          id="p-nombre"
          value={d.nombre}
          placeholder="Guardia noche"
          onChange={(e) => set("nombre", e.target.value)}
        />
      </Campo>
      <Campo etiqueta="Cargo" htmlFor="p-cargo">
        <Combobox
          id="p-cargo"
          opciones={cargos}
          valor={d.cargoId}
          onCambiar={([v]) => set("cargoId", v ?? null)}
          placeholder="Elegir cargo"
        />
      </Campo>
      <Campo etiqueta="Patrón" htmlFor="p-patron">
        <Select
          id="p-patron"
          valor={d.patron}
          onCambiar={(v) => set("patron", v)}
          opciones={PATRONES}
        />
      </Campo>
      {d.patron === "otro" ? (
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Días de trabajo" htmlFor="p-t">
            <Input
              id="p-t"
              type="number"
              inputMode="numeric"
              min={1}
              max={28}
              value={d.trabajo}
              onChange={(e) => set("trabajo", e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Días de descanso" htmlFor="p-r">
            <Input
              id="p-r"
              type="number"
              inputMode="numeric"
              min={1}
              max={28}
              value={d.descanso}
              onChange={(e) => set("descanso", e.target.value)}
            />
          </Campo>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Inicio" htmlFor="p-ini">
          <InputHora id="p-ini" valor={d.inicio} onCambiar={(v) => set("inicio", v)} />
        </Campo>
        <Campo etiqueta="Fin" htmlFor="p-fin">
          <InputHora id="p-fin" valor={d.fin} onCambiar={(v) => set("fin", v)} />
        </Campo>
      </div>
      {cruza ? (
        <p className="flex gap-2 rounded-md bg-info-muted px-3 py-2.5 text-sm font-medium text-info-fg">
          <Info className="mt-0.5 size-4 flex-none" aria-hidden />
          El cruce de medianoche se calcula solo: termina el día siguiente a las {d.fin}.
        </p>
      ) : null}
      <RadioGroup
        etiqueta="Jornada"
        orientacion="fila"
        valor={d.jornada}
        onCambiar={(v) => set("jornada", v)}
        opciones={[
          { valor: "dia", etiqueta: "Día" },
          { valor: "noche", etiqueta: "Noche" },
          { valor: "rotativa", etiqueta: "Rotativa" },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Dotación" htmlFor="p-dot">
          <Input
            id="p-dot"
            type="number"
            inputMode="numeric"
            min={1}
            value={d.dotacion}
            onChange={(e) => set("dotacion", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Vigente desde" htmlFor="p-desde">
          <InputFecha id="p-desde" valor={d.desde} onCambiar={(v) => set("desde", v)} />
        </Campo>
      </div>
    </div>
  );
}

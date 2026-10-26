"use client";

import type { Dispatch, SetStateAction } from "react";

import { Campo, Combobox, Input, InputFecha, RadioGroup, Select } from "@opai/ds";

import type { FuncionPuestoOpcion, PatronTurnoOpcion } from "@/lib/tipos-maestros";

import { CamposHorario } from "./campos-horario";
import type { DatosPuesto } from "./puesto-datos";

export { type DatosPuesto, inicialPuesto, puestoAInput } from "./puesto-datos";

type Props = {
  d: DatosPuesto;
  setD: Dispatch<SetStateAction<DatosPuesto>>;
  cargos: { valor: string; etiqueta: string }[];
  funciones: FuncionPuestoOpcion[];
  patrones: PatronTurnoOpcion[];
};

/** Nuevo puesto-posición (Brief 11): función, patrón del catálogo, horario por tramos y colación. */
export function CamposPuesto({ d, setD, cargos, funciones, patrones }: Props) {
  const set = <K extends keyof DatosPuesto>(k: K, v: DatosPuesto[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  const opcionesFuncion = funciones.map((f) => ({ valor: f.id, etiqueta: f.nombre }));
  const opcionesPatron = patrones.map((p) => ({
    valor: p.id,
    etiqueta: `${p.nombre} · ${p.resumen}`,
  }));
  function elegirPatron(id: string) {
    const p = patrones.find((x) => x.id === id);
    setD((x) => ({
      ...x,
      patronId: id,
      trabajo: p ? String(p.diasTrabajo) : x.trabajo,
      descanso: p ? String(p.diasDescanso) : x.descanso,
    }));
  }
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
      <Campo etiqueta="Función" htmlFor="p-funcion">
        <Combobox
          id="p-funcion"
          opciones={opcionesFuncion}
          valor={d.funcionId ?? ""}
          onCambiar={([v]) => set("funcionId", v ?? null)}
          placeholder="Elegir función"
        />
      </Campo>
      <Campo etiqueta="Cargo" htmlFor="p-cargo">
        <Combobox
          id="p-cargo"
          opciones={cargos}
          valor={d.cargoId ?? ""}
          onCambiar={([v]) => set("cargoId", v ?? null)}
          placeholder="Elegir cargo"
        />
      </Campo>
      <Campo etiqueta="Patrón de turno" htmlFor="p-patron">
        <Select
          id="p-patron"
          valor={d.patronId ?? undefined}
          onCambiar={elegirPatron}
          opciones={opcionesPatron}
          placeholder="Elegir patrón"
        />
      </Campo>
      <CamposHorario d={d} setD={setD} />
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
      <Campo etiqueta="Vigente desde" htmlFor="p-desde">
        <InputFecha id="p-desde" valor={d.desde} onCambiar={(v) => set("desde", v)} />
      </Campo>
    </div>
  );
}

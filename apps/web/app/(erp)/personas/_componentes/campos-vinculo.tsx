"use client";

import { Campo, InputFecha, Select } from "@opai/ds";

import { TIPO_CONTRATO } from "@/app/_components/maestros/estados";

export type DatosVinculo = { cargoId: string; tipo: string; inicio: string; termino: string };

export const vinculoVacio = (hoy: string): DatosVinculo => ({
  cargoId: "",
  tipo: "indefinido",
  inicio: hoy,
  termino: "",
});

/** Plazo fijo y obra exigen término pactado. */
export const conTermino = (tipo: string) => tipo === "plazo_fijo" || tipo === "por_obra";
export const vinculoInvalido = (v: DatosVinculo) =>
  !v.cargoId || !v.inicio || (conTermino(v.tipo) && (!v.termino || v.termino < v.inicio));

type Props = {
  v: DatosVinculo;
  onCambiar: (v: DatosVinculo) => void;
  cargos: readonly { valor: string; etiqueta: string }[];
};

/** Vínculo laboral: cargo, tipo de contrato, inicio y término pactado. */
export function CamposVinculo({ v, onCambiar, cargos }: Props) {
  const set = (k: keyof DatosVinculo, valor: string) => onCambiar({ ...v, [k]: valor });
  return (
    <fieldset className="flex flex-col gap-3.5">
      <legend className="mb-2 text-md font-semibold text-fg">Vínculo laboral</legend>
      <Campo etiqueta="Cargo" htmlFor="v-cargo">
        <Select
          id="v-cargo"
          valor={v.cargoId}
          onCambiar={(x) => set("cargoId", x)}
          opciones={cargos}
          placeholder="Elegir cargo"
        />
      </Campo>
      <Campo etiqueta="Tipo de contrato" htmlFor="v-tipo">
        <Select
          id="v-tipo"
          valor={v.tipo}
          onCambiar={(x) => set("tipo", x)}
          opciones={Object.entries(TIPO_CONTRATO).map(([valor, etiqueta]) => ({ valor, etiqueta }))}
        />
      </Campo>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Campo etiqueta="Inicio" htmlFor="v-inicio">
          <InputFecha id="v-inicio" valor={v.inicio} onCambiar={(x) => set("inicio", x)} />
        </Campo>
        {conTermino(v.tipo) ? (
          <Campo
            etiqueta="Término pactado"
            htmlFor="v-termino"
            {...(v.termino && v.termino < v.inicio ? { error: "Anterior al inicio" } : {})}
          >
            <InputFecha id="v-termino" valor={v.termino} onCambiar={(x) => set("termino", x)} />
          </Campo>
        ) : null}
      </div>
    </fieldset>
  );
}

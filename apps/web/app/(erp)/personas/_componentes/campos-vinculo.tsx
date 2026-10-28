"use client";

import { useEffect, useState } from "react";
import { useCapacidad } from "@/app/_components/use-capacidad";
import {
  CamposDestinoVinculo,
  type DestinoVinculo,
  type OpcionesDestino,
} from "./campos-destino-vinculo";
import { Campo, InputFecha, Select } from "@opai/ds";

import { TIPO_CONTRATO } from "@/app/_components/maestros/estados";

export type DatosVinculo = DestinoVinculo & {
  cargoId: string;
  tipo: string;
  inicio: string;
  termino: string;
};

export const vinculoVacio = (hoy: string): DatosVinculo => ({
  instalacionId: "",
  puestoId: "",
  horasSemanales: "",
  distribucion: "",
  cargoId: "",
  tipo: "indefinido",
  inicio: hoy,
  termino: "",
});

/** Plazo fijo y obra exigen término pactado. */
export const conTermino = (tipo: string) => tipo === "plazo_fijo" || tipo === "por_obra";
export const vinculoInvalido = (v: DatosVinculo) =>
  !v.instalacionId ||
  !/^\d+$/.test(v.horasSemanales) ||
  Number(v.horasSemanales) < 1 ||
  Number(v.horasSemanales) > 168 ||
  !v.distribucion.trim() ||
  !v.cargoId ||
  !v.inicio ||
  (conTermino(v.tipo) && (!v.termino || v.termino < v.inicio));

type Props = Partial<OpcionesDestino> & {
  v: DatosVinculo;
  onCambiar: (v: DatosVinculo) => void;
  cargos: readonly { valor: string; etiqueta: string }[];
};

/** Vínculo laboral: cargo, tipo de contrato, inicio y término pactado. */
export function CamposVinculo({ v, onCambiar, cargos, instalaciones, puestos }: Props) {
  const { ejecutar } = useCapacidad("erp");
  const [opciones, setOpciones] = useState<OpcionesDestino>({ instalaciones: [], puestos: [] });
  useEffect(() => {
    if (instalaciones) return;
    let vigente = true;
    void ejecutar<{ items: OpcionesDestino["instalaciones"] }>("core.instalaciones.list", {
      limite: 100,
    }).then((r) => {
      if (vigente && r) setOpciones((o) => ({ ...o, instalaciones: r.items }));
    });
    return () => {
      vigente = false;
    };
    // El formulario se monta solo al abrir la hoja.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (puestos || !v.instalacionId) return;
    let vigente = true;
    void ejecutar<OpcionesDestino["puestos"]>("core.puestos.list", {
      instalacionId: v.instalacionId,
      soloActivos: true,
    }).then((r) => {
      if (vigente && r) setOpciones((o) => ({ ...o, puestos: r }));
    });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.instalacionId]);
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
      <CamposDestinoVinculo
        v={v}
        onCambiar={(d) => onCambiar({ ...v, ...d })}
        instalaciones={instalaciones ?? opciones.instalaciones}
        puestos={puestos ?? opciones.puestos}
      />
    </fieldset>
  );
}

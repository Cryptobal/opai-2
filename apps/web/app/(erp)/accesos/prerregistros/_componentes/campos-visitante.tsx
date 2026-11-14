"use client";

import { Button, Campo, Input, Select } from "@opai/ds";

import { DOCS } from "../../_componentes/borrador-entrada";
import type { VisitanteB } from "./borrador";

type P = {
  i: number;
  v: VisitanteB;
  set: (v: VisitanteB) => void;
  quitar: (() => void) | null;
};

/** Documento del visitante: tipo, número y, si no es RUN, país. */
function CamposDocumento({ v, set, id }: Pick<P, "v" | "set"> & { id: (c: string) => string }) {
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
        <Campo etiqueta="Documento" htmlFor={id("doc")}>
          <Select
            id={id("doc")}
            valor={v.docTipo}
            opciones={DOCS}
            onCambiar={(x) => set({ ...v, docTipo: x })}
          />
        </Campo>
        <Campo etiqueta="RUN o pasaporte" htmlFor={id("numero")}>
          <Input
            id={id("numero")}
            value={v.numero}
            maxLength={40}
            onChange={(e) => set({ ...v, numero: e.target.value })}
          />
        </Campo>
      </div>
      {v.docTipo === "run" ? null : (
        <Campo etiqueta="País (código de 2 o 3 letras)" htmlFor={id("pais")}>
          <Input
            id={id("pais")}
            value={v.pais}
            maxLength={3}
            onChange={(e) => set({ ...v, pais: e.target.value.toUpperCase() })}
          />
        </Campo>
      )}
    </>
  );
}

/** Un visitante: nombre, documento (solo se guarda su huella), empresa y patente. */
export function CamposVisitante({ i, v, set, quitar }: P) {
  const id = (c: string) => `pr-v${i}-${c}`;
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <legend className="t-label px-1">Visitante {i + 1}</legend>
      <Campo etiqueta="Nombre" htmlFor={id("nombre")}>
        <Input
          id={id("nombre")}
          value={v.nombre}
          maxLength={120}
          onChange={(e) => set({ ...v, nombre: e.target.value })}
        />
      </Campo>
      <CamposDocumento v={v} set={set} id={id} />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Empresa" htmlFor={id("empresa")}>
          <Input
            id={id("empresa")}
            value={v.empresa}
            maxLength={120}
            onChange={(e) => set({ ...v, empresa: e.target.value })}
          />
        </Campo>
        <Campo etiqueta="Patente (opcional)" htmlFor={id("patente")}>
          <Input
            id={id("patente")}
            value={v.patente}
            maxLength={12}
            onChange={(e) => set({ ...v, patente: e.target.value.toUpperCase() })}
          />
        </Campo>
      </div>
      {quitar ? (
        <Button variant="ghost" className="self-start" onClick={quitar}>
          Quitar visitante
        </Button>
      ) : null}
    </fieldset>
  );
}

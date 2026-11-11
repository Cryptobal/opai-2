"use client";

import { useState } from "react";

import { gruposDeVariables } from "@opai/domain";
import { ChipVariable, InputBusqueda } from "@opai/ds";

/** Panel «Variables» (diseño 06): buscar y tocar una variable para insertarla en el cursor. */
export function PanelVariables({ onInsertar }: { onInsertar: (clave: string) => void }) {
  const [busqueda, setBusqueda] = useState("");
  const grupos = gruposDeVariables(busqueda);
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <span className="t-label">Variables</span>
      <InputBusqueda
        valor={busqueda}
        onCambiar={setBusqueda}
        placeholder="Buscar variable"
        aria-label="Buscar variable"
      />
      {grupos.length === 0 ? (
        <p className="t-caption">Ninguna variable coincide. Solo se usan las de esta lista.</p>
      ) : (
        grupos.map((g) => (
          <div key={g.grupo} className="flex flex-col gap-1.5">
            <span className="t-caption">{g.titulo}</span>
            <div className="flex flex-wrap gap-1.5">
              {g.variables.map((v) => (
                <ChipVariable
                  key={v.clave}
                  clave={v.clave}
                  descripcion={v.etiqueta}
                  onInsertar={() => onInsertar(v.clave)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

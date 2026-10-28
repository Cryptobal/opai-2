"use client";

import { useState } from "react";

import { Select } from "@opai/ds";

/** Teléfono: elige la columna visible del tablero (una a la vez) y la desplaza a la vista. */
export function SelectorEtapa({ etapas }: { etapas: { id: string; nombre: string; n: number }[] }) {
  const [actual, setActual] = useState(etapas[0]?.id);
  return (
    <div className="md:hidden">
      <Select
        aria-label="Etapa visible"
        valor={actual}
        opciones={etapas.map((e) => ({ valor: e.id, etiqueta: `${e.nombre} · ${e.n}` }))}
        onCambiar={(id) => {
          setActual(id);
          document
            .getElementById(`etapa-${id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
        }}
      />
    </div>
  );
}

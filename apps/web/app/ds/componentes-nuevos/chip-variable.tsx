"use client";

import { useState } from "react";

import { ChipVariable } from "@opai/ds";

/** ChipVariable (documentos v4 · 06): en el panel inserta; en el texto, conocida o inexistente. */
export function MuestraChipVariable() {
  const [ultima, setUltima] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {["persona.nombre", "persona.rut", "vinculo.cargo", "sueldo.base"].map((c) => (
          <ChipVariable key={c} clave={c} descripcion={c} onInsertar={() => setUltima(c)} />
        ))}
      </div>
      <p className="t-caption">{ultima ? `Insertada: {${ultima}}` : "Toca una variable"}</p>
      <p className="t-body-sm rounded-sm border border-paper-rule bg-paper p-4 text-paper-fg">
        En Santiago, entre la empresa y <ChipVariable clave="persona.nombre" />, RUT{" "}
        <ChipVariable clave="persona.rut" />, comuna{" "}
        <ChipVariable clave="persona.comuna_obra" conocida={false} />.
      </p>
    </div>
  );
}

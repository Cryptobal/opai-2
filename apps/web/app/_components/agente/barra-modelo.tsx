"use client";

import { Segmentado, Select } from "@opai/ds";

import type { Modelo, Nivel } from "./tipos";

const CLASE = { economica: "económica", estandar: "estándar", potente: "potente" } as const;
const clave = (m: Modelo) => `${m.proveedor}::${m.modelo}`;

/** Selector de modelo y nivel de confirmación (paso a paso o aprobar todo). */
export function BarraModelo({
  modelos,
  modelo,
  nivel,
  onModelo,
  onNivel,
}: {
  modelos: Modelo[];
  modelo: Modelo | null;
  nivel: Nivel;
  onModelo: (m: Modelo | null) => void;
  onNivel: (n: Nivel) => void;
}) {
  return (
    <div className="flex flex-none flex-col gap-2 border-b border-border p-3">
      <Select
        aria-label="Modelo"
        valor={modelo ? clave(modelo) : undefined}
        onCambiar={(v) => onModelo(modelos.find((m) => clave(m) === v) ?? null)}
        opciones={modelos.map((m) => ({
          valor: clave(m),
          etiqueta: m.modelo,
          descripcion: CLASE[m.clase],
        }))}
      />
      <Segmentado
        etiqueta="Nivel de confirmación"
        activa={nivel}
        opciones={[
          { id: "paso_a_paso", etiqueta: "Paso a paso", onClick: () => onNivel("paso_a_paso") },
          { id: "aprobar_todo", etiqueta: "Aprobar todo", onClick: () => onNivel("aprobar_todo") },
        ]}
      />
    </div>
  );
}

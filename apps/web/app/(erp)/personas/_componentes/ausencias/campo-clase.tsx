"use client";

import { Campo, Select } from "@opai/ds";

import type { ClaseAusencia } from "./tipos";

const SIN_CLASE = "sin-clase";

/** Clase de la ausencia (CAR-393 parte 3): solo las del tipo elegido; si el catálogo no trae ninguna, no se muestra. */
export function CampoClase({
  clases,
  tipo,
  valor,
  onCambiar,
}: {
  clases: readonly ClaseAusencia[];
  tipo: string;
  valor: string;
  onCambiar: (v: string) => void;
}) {
  const delTipo = clases.filter((c) => c.tipo === tipo);
  if (delTipo.length === 0) return null;
  return (
    <Campo
      etiqueta="Clase"
      htmlFor="aus-clase"
      ayuda="La define tu empresa en Configuración › Personas."
    >
      <Select
        id="aus-clase"
        valor={valor || SIN_CLASE}
        onCambiar={(v) => onCambiar(v === SIN_CLASE ? "" : v)}
        opciones={[
          { valor: SIN_CLASE, etiqueta: "Sin especificar" },
          ...delTipo.map((c) => ({ valor: c.nombre, etiqueta: c.nombre })),
        ]}
      />
    </Campo>
  );
}

"use client";

import { Campo, Select } from "@opai/ds";

/** Una clase del catálogo de la empresa, ligada a su tipo base. */
export type ClaseAusencia = { nombre: string; tipo: string };

const SIN_CLASE = "sin-clase";

/**
 * Clase de la ausencia (CAR-393 parte 3), compartida por la ficha de la persona y la hoja de la pauta: solo las del tipo
 * elegido; si el catálogo no trae ninguna (o no se pudo leer), no se muestra.
 */
export function CampoClase({
  id = "aus-clase",
  clases,
  tipo,
  valor,
  onCambiar,
}: {
  id?: string;
  clases: readonly ClaseAusencia[];
  tipo: string;
  valor: string;
  onCambiar: (v: string) => void;
}) {
  const delTipo = clases.filter((c) => c.tipo === tipo);
  if (delTipo.length === 0) return null;
  return (
    <Campo etiqueta="Clase" htmlFor={id} ayuda="La define tu empresa en Configuración › Personas.">
      <Select
        id={id}
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

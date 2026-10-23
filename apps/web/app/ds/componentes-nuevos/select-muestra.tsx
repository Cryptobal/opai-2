"use client";

import { useState } from "react";

import { Select } from "@opai/ds";

/** Select con estado local para las muestras de /ds. */
export function SelectMuestra({
  id,
  opciones,
  inicial,
  invalido,
  disabled,
}: {
  id?: string;
  opciones: readonly string[];
  inicial?: string;
  invalido?: boolean;
  disabled?: boolean;
}) {
  const [valor, setValor] = useState(inicial ?? opciones[0]);
  return (
    <Select
      {...(id ? { id } : {})}
      valor={valor}
      onCambiar={setValor}
      opciones={opciones.map((o) => ({ valor: o, etiqueta: o }))}
      {...(invalido ? { invalido } : {})}
      {...(disabled ? { disabled } : {})}
    />
  );
}

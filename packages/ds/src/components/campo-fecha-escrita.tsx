"use client";

import { useId } from "react";

/** Campo para escribir la fecha (dd-mm-aaaa) dentro de la hoja del calendario en teléfono. */
export function CampoFechaEscrita({
  texto,
  onTexto,
}: {
  texto: string;
  onTexto: (texto: string) => void;
}) {
  return (
    <input
      id={useId()}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      lang="es-CL"
      placeholder="dd-mm-aaaa"
      aria-label="Escribir la fecha"
      maxLength={10}
      value={texto}
      onChange={(e) => onTexto(e.target.value)}
      className="h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-md text-fg outline-none focus-visible:border-accent"
    />
  );
}

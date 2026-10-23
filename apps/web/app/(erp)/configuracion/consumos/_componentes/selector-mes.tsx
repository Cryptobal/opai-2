"use client";

import { Select } from "@opai/ds";

import { useParametros } from "@/app/_components/maestros/use-url";

/** Mes de los consumos (`?mes=aaaa-mm`). */
export function SelectorMes({
  mes,
  opciones,
}: {
  mes: string;
  opciones: { valor: string; etiqueta: string }[];
}) {
  const { fijar } = useParametros();
  return (
    <Select
      aria-label="Mes"
      className="w-48"
      valor={mes}
      opciones={opciones}
      onCambiar={(v) => fijar({ mes: v })}
    />
  );
}

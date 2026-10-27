"use client";

import { ChipToggle } from "@opai/ds";

import { useParametros } from "@/app/_components/maestros/use-url";

import type { ConteosPuestos } from "./puestos-filtro";

/** Chips de la lista de puestos (Brief 11): Todos · Solo PPC · Inactivos, filtrados por `?filtro=`. */
export function ChipsPuestos({ conteos }: { conteos: ConteosPuestos }) {
  const { valor, fijar } = useParametros();
  const actual = valor("filtro") ?? "todos";
  const set = (f: string | null) => fijar({ filtro: f, cursor: null, prev: null });
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      <ChipToggle
        etiqueta="Todos"
        contador={conteos.todos}
        activo={actual === "todos"}
        onCambiar={() => set(null)}
      />
      <ChipToggle
        etiqueta="Solo PPC"
        contador={conteos.ppc}
        activo={actual === "ppc"}
        onCambiar={() => set("ppc")}
      />
      <ChipToggle
        etiqueta="Inactivos"
        contador={conteos.inactivos}
        activo={actual === "inactivos"}
        onCambiar={() => set("inactivos")}
      />
    </div>
  );
}

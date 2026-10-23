"use client";

import { Select } from "@opai/ds";

import { useParametros } from "@/app/_components/maestros/use-url";
import type { PuestoDeCargo } from "@/lib/tipos-sueldo";

/** Puesto a considerar en el sueldo (`?puesto=`): sin asignaciones aún, se elige a mano. */
export function SelectorPuesto({ puestos }: { puestos: PuestoDeCargo[] }) {
  const { valor, fijar } = useParametros();
  if (!puestos.length) return null;
  return (
    <Select
      aria-label="Puesto a considerar"
      className="md:w-72"
      valor={valor("puesto") ?? "ninguno"}
      onCambiar={(v) => fijar({ puesto: v === "ninguno" ? null : v })}
      opciones={[
        { valor: "ninguno", etiqueta: "Sin puesto" },
        ...puestos.map((p) => ({ valor: p.id, etiqueta: `${p.instalacion} · ${p.nombre}` })),
      ]}
    />
  );
}

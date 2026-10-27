"use client";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import type { Puesto } from "@/lib/tipos-maestros";

import { opcionesPatron } from "./puestos-filtro";

/**
 * Chips de la lista de puestos (review 5662449808 punto 3): estado (activo), cobertura y patrón,
 * por `?estado=`, `?cobertura=` y `?patron=`.
 */
export function ChipsPuestos({ puestos }: { puestos: readonly Puesto[] }) {
  const patrones = opcionesPatron(puestos);
  return (
    <ChipsFiltro
      filtros={[
        {
          param: "estado",
          etiqueta: "Estado",
          opciones: [
            { valor: "activo", etiqueta: "Activo" },
            { valor: "inactivo", etiqueta: "Inactivo" },
          ],
        },
        {
          param: "cobertura",
          etiqueta: "Cobertura",
          opciones: [
            { valor: "cubierto", etiqueta: "Cubierto" },
            { valor: "ppc", etiqueta: "PPC · Sin asignar" },
          ],
        },
        ...(patrones.length > 0
          ? [{ param: "patron", etiqueta: "Patrón", opciones: patrones }]
          : []),
      ]}
    />
  );
}

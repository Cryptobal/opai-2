"use client";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import type { Puesto } from "@/lib/tipos-maestros";

import { opcionesPatron } from "./puestos-filtro";

/**
 * Chips de la lista de puestos (review 5662449808 punto 3): estado (activo), cobertura y patrón,
 * por `?pestado=`, `?pcobertura=` y `?ppatron=`.
 */
export function ChipsPuestos({ puestos }: { puestos: readonly Puesto[] }) {
  const patrones = opcionesPatron(puestos);
  return (
    <ChipsFiltro
      conservarPaginacion
      filtros={[
        {
          param: "pestado",
          etiqueta: "Estado",
          opciones: [
            { valor: "activo", etiqueta: "Activo" },
            { valor: "inactivo", etiqueta: "Inactivo" },
          ],
        },
        {
          param: "pcobertura",
          etiqueta: "Cobertura",
          opciones: [
            { valor: "cubierto", etiqueta: "Cubierto" },
            { valor: "ppc", etiqueta: "PPC · Sin asignar" },
          ],
        },
        ...(patrones.length > 0
          ? [{ param: "ppatron", etiqueta: "Patrón", opciones: patrones }]
          : []),
      ]}
    />
  );
}

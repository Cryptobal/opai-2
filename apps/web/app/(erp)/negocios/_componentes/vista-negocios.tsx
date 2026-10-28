"use client";

import { useSearchParams } from "next/navigation";

import { Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/** Lo que el cambio de vista conserva: búsqueda, filtro de estado y la etapa elegida. */
const CONSERVA = ["q", "estado", "etapa"] as const;

/** `/negocios` (tablero) o `/negocios?vista=lista`, con los filtros y la etapa de la URL actual. */
export function hrefVista(vista: "tablero" | "lista", actual: URLSearchParams) {
  const p = new URLSearchParams();
  if (vista === "lista") p.set("vista", "lista");
  for (const k of CONSERVA) {
    const v = actual.get(k);
    if (v) p.set(k, v);
  }
  // Desde una ficha abierta en el tablero (`?tablero=`), su columna es la etapa elegida.
  const columna = actual.get("tablero");
  if (columna && !p.has("etapa")) p.set("etapa", columna);
  const q = p.toString();
  return q ? `/negocios?${q}` : "/negocios";
}

/**
 * Tablero / Lista (export, CAR-33): visible en las dos vistas y en la lista de la ficha. Lee la URL en
 * el cliente para seguir la etapa que el selector del tablero fija sin recargar (`?etapa=`).
 */
export function VistaNegocios({ activa }: { activa: "tablero" | "lista" }) {
  const actual = useSearchParams();
  return (
    <Segmentado
      etiqueta="Vista de negocios"
      activa={activa}
      Link={LinkNext}
      opciones={[
        { id: "tablero", etiqueta: "Tablero", href: hrefVista("tablero", actual) },
        { id: "lista", etiqueta: "Lista", href: hrefVista("lista", actual) },
      ]}
    />
  );
}

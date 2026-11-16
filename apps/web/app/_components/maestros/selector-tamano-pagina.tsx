"use client";

import { Menu } from "@opai/ds";

import type { TamanoPagina } from "./paginacion-cursor";
import { TAMANOS_PAGINA } from "./paginacion-cursor";
import { useParametros } from "./use-url";

/** Cambia `?limite=` y vuelve a la primera página de resultados. */
export function SelectorTamanoPagina({ actual }: { actual: TamanoPagina }) {
  const { fijar } = useParametros();
  return (
    <Menu
      etiqueta="Tamaño de página"
      lado="abajo-derecha"
      claseDisparador="h-8 min-h-8 rounded-full border border-border bg-surface px-3 text-sm font-medium text-fg-muted"
      disparador={`${actual} por página`}
      items={TAMANOS_PAGINA.map((n) => ({
        id: String(n),
        etiqueta: `${n} por página`,
        marcado: n === actual,
        onSelect: () =>
          fijar({
            limite: n === actual ? null : String(n),
            cursor: null,
            prev: null,
          }),
      }))}
    />
  );
}
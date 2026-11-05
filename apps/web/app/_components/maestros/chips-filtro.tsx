"use client";

import { Chip, Menu } from "@opai/ds";

import { useParametros } from "./use-url";

export type Filtro = {
  param: string;
  etiqueta: string;
  opciones: readonly { valor: string; etiqueta: string }[];
  /** Opción que rige cuando la URL no trae el parámetro: el disparador la nombra («Mes: …»). */
  porDefecto?: string;
};

/** Chips de filtro por URL: activo como chip con quitar; inactivo como chip punteado con menú. */
export function ChipsFiltro({
  filtros,
  conservarPaginacion = false,
}: {
  filtros: readonly Filtro[];
  conservarPaginacion?: boolean;
}) {
  const { valor, fijar } = useParametros();
  const paginacion = conservarPaginacion ? {} : { cursor: null, prev: null };
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      {filtros.map((f) => {
        const actual = valor(f.param);
        const opcion = f.opciones.find((o) => o.valor === actual);
        if (opcion)
          return (
            <Chip
              key={f.param}
              etiqueta={f.etiqueta}
              valor={opcion.etiqueta}
              onQuitar={() => fijar({ [f.param]: null, ...paginacion })}
            />
          );
        return (
          <Menu
            key={f.param}
            etiqueta={`Filtrar por ${f.etiqueta.toLowerCase()}`}
            lado="abajo-izquierda"
            claseDisparador="h-11 min-h-11 rounded-full md:h-8 md:min-h-8 border border-dashed border-border-strong bg-surface px-3 text-sm font-medium text-fg-muted"
            disparador={
              f.porDefecto && f.opciones.some((o) => o.valor === f.porDefecto)
                ? `${f.etiqueta}: ${f.opciones.find((o) => o.valor === f.porDefecto)?.etiqueta}`
                : f.etiqueta
            }
            items={f.opciones.map((o) => ({
              id: o.valor,
              etiqueta: o.etiqueta,
              onSelect: () => fijar({ [f.param]: o.valor, ...paginacion }),
            }))}
          />
        );
      })}
    </div>
  );
}

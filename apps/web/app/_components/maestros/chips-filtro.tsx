"use client";

import { Chip, Menu } from "@opai/ds";

import { useParametros } from "./use-url";

export type Filtro = {
  param: string;
  etiqueta: string;
  opciones: readonly { valor: string; etiqueta: string }[];
};

/** Chips de filtro por URL: activo como chip con quitar; inactivo como chip punteado con menú. */
export function ChipsFiltro({ filtros }: { filtros: readonly Filtro[] }) {
  const { valor, fijar } = useParametros();
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
              onQuitar={() => fijar({ [f.param]: null, cursor: null, prev: null })}
            />
          );
        return (
          <Menu
            key={f.param}
            etiqueta={`Filtrar por ${f.etiqueta.toLowerCase()}`}
            lado="abajo-izquierda"
            claseDisparador="h-11 min-h-11 rounded-full md:h-8 md:min-h-8 border border-dashed border-border-strong bg-surface px-3 text-sm font-medium text-fg-muted"
            disparador={f.etiqueta}
            items={f.opciones.map((o) => ({
              id: o.valor,
              etiqueta: o.etiqueta,
              onSelect: () => fijar({ [f.param]: o.valor, cursor: null, prev: null }),
            }))}
          />
        );
      })}
    </div>
  );
}

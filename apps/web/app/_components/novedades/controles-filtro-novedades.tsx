"use client";

import { Button, Campo, Segmentado, Select } from "@opai/ds";

import type { FiltroNovedades } from "./encabezado-novedades";

export function ControlesFiltroNovedades({
  noLeidas,
  filtro,
  onFiltro,
  modulo,
  modulos,
  onModulo,
  onMarcarFiltradas,
  textoMarcar,
}: {
  noLeidas: number;
  filtro: FiltroNovedades;
  onFiltro: (f: FiltroNovedades) => void;
  modulo: string;
  modulos: readonly string[];
  onModulo: (modulo: string) => void;
  onMarcarFiltradas: () => void;
  textoMarcar: string;
}) {
  const opcionesModulo = [
    { valor: "todos", etiqueta: "Todos los módulos" },
    ...modulos.map((m) => ({ valor: m, etiqueta: m })),
  ];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Segmentado
          etiqueta="Filtrar novedades"
          activa={filtro}
          opciones={[
            { id: "todas", etiqueta: "Todas", onClick: () => onFiltro("todas") },
            {
              id: "no_leidas",
              etiqueta: noLeidas > 0 ? `No leídas (${noLeidas})` : "No leídas",
              onClick: () => onFiltro("no_leidas"),
            },
          ]}
        />
        <Campo etiqueta="Módulo" htmlFor="filtro-modulo-novedades" className="w-full sm:w-52">
          <Select
            id="filtro-modulo-novedades"
            valor={modulo}
            onCambiar={onModulo}
            opciones={opcionesModulo}
          />
        </Campo>
      </div>
      {noLeidas > 0 ? (
        <Button variant="secondary" onClick={onMarcarFiltradas}>
          {textoMarcar}
        </Button>
      ) : null}
    </div>
  );
}
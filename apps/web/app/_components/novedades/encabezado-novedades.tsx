"use client";

import { Button, Segmentado } from "@opai/ds";

export type FiltroNovedades = "todas" | "no_leidas";

/**
 * Resumen, filtro «Todas / No leídas» y «Marcar todas como leídas» de la lista de Novedades (CAR-245).
 * El filtro es local: la lista ya trae todas las novedades del usuario, con su estado de lectura.
 */
export function EncabezadoNovedades({
  noLeidas,
  filtro,
  onFiltro,
  onMarcarTodas,
}: {
  noLeidas: number;
  filtro: FiltroNovedades;
  onFiltro: (f: FiltroNovedades) => void;
  onMarcarTodas: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        {noLeidas > 0 ? (
          <Button variant="secondary" onClick={onMarcarTodas}>
            Marcar todas como leídas
          </Button>
        ) : null}
      </div>
      <p className="t-body text-fg-muted" aria-live="polite">
        {noLeidas > 0
          ? `${noLeidas} ${noLeidas === 1 ? "novedad sin leer" : "novedades sin leer"}`
          : "Estás al día: leíste todas las novedades."}
      </p>
    </div>
  );
}

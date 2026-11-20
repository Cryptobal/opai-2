"use client";

import type { ReactNode } from "react";

import { type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { columnasPuntos } from "./lista-puntos-columnas";
import { TarjetaPuntoLista } from "./lista-puntos-tarjeta";
import type { Punto } from "./tipos";

/** Lista de puntos de control (c13p): tabla desde tablet, filas en teléfono. Abre el drawer `?punto=`. */
export function ListaPuntos({
  state,
  puntos,
  accionVacio,
  seleccionadoId,
  onHover,
  onFoco,
}: {
  state: EstadoPantalla;
  puntos: readonly Punto[];
  accionVacio?: ReactNode;
  seleccionadoId?: string | null;
  onHover?: (id: string | null) => void;
  onFoco?: (id: string) => void;
}) {
  return (
    <div className="@container">
      <ListScreen<Punto>
        state={state}
        titulo="Puntos"
        sinCabecera
        items={puntos}
        clave={(p) => p.id}
        href={(p) => `?punto=${p.id}`}
        Link={LinkNext}
        tarjeta={(p) => (
          <TarjetaPuntoLista
            p={p}
            seleccionadoId={seleccionadoId}
            onHover={onHover}
            onFoco={onFoco}
          />
        )}
        columnas={columnasPuntos({ seleccionadoId, onHover })}
        textos={{
          vacio: {
            titulo: "Aún no hay puntos",
            descripcion: "Crea el primer punto en el mapa de arriba: abre «Nuevo punto» con GPS o QR + GPS.",
            accion: accionVacio,
          },
        }}
      />
    </div>
  );
}
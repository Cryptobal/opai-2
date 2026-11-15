"use client";

import type { ReactNode } from "react";

import { Badge, cn, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { MODO_PUNTO, puntoConGps } from "./etiquetas";
import { columnasPuntos } from "./lista-puntos-columnas";
import { CeldaPuntoResaltable } from "./lista-puntos-resalte";
import type { Punto } from "./tipos";

const m = (v: number | null, u: string) => (v != null ? `${v} ${u}` : "—");

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
        tarjeta={(p) => {
          const inactivo = p.estado !== "activo";
          return (
            <CeldaPuntoResaltable
              id={p.id}
              seleccionadoId={seleccionadoId}
              onHover={onHover}
              onFoco={onFoco}
              className="flex w-full gap-2"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("truncate text-base font-medium", inactivo && "text-fg-muted")}>
                  {p.nombre}
                </span>
                <span className="t-caption truncate">
                  {MODO_PUNTO[p.modo]} · radio {m(p.radioM, "m")} · {m(p.permanenciaS, "s")}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {!puntoConGps(p.modo) ? (
                  <Badge tono="neutro" className="text-[10px]">
                    Sin GPS
                  </Badge>
                ) : null}
                <Badge tono={inactivo ? "neutro" : "success"}>{inactivo ? "Archivado" : "Activo"}</Badge>
              </span>
            </CeldaPuntoResaltable>
          );
        }}
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
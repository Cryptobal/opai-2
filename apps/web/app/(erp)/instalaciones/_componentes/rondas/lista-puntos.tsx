"use client";

import type { ReactNode } from "react";

import { Badge, cn, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { MODO_PUNTO } from "./etiquetas";
import type { Punto } from "./tipos";

const m = (v: number | null, u: string) => (v != null ? `${v} ${u}` : "—");
const sinGps = (p: Punto) => p.modo === "qr";

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
            <span
              data-punto-id={p.id}
              className={cn(
                "flex w-full gap-2",
                seleccionadoId === p.id && "rounded-md ring-2 ring-accent ring-offset-2 ring-offset-surface",
              )}
              onMouseEnter={() => onHover?.(p.id)}
              onMouseLeave={() => onHover?.(null)}
              onFocus={() => onFoco?.(p.id)}
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
                {sinGps(p) ? (
                  <Badge tono="neutro" className="text-[10px]">
                    Sin GPS
                  </Badge>
                ) : null}
                <Badge tono={inactivo ? "neutro" : "success"}>{inactivo ? "Archivado" : "Activo"}</Badge>
              </span>
            </span>
          );
        }}
        columnas={[
          {
            id: "nombre",
            etiqueta: "Punto",
            className: "min-w-24 font-medium whitespace-normal wrap-break-word",
            render: (p) => (
              <span
                data-punto-id={p.id}
                className={cn(
                  "flex flex-col",
                  p.estado !== "activo" && "text-fg-muted",
                  seleccionadoId === p.id && "rounded-sm ring-2 ring-accent ring-offset-2 ring-offset-surface",
                )}
                onMouseEnter={() => onHover?.(p.id)}
                onMouseLeave={() => onHover?.(null)}
              >
                <span>{p.nombre}</span>
                {p.exigeFoto ? <span className="t-caption">Pide foto</span> : null}
                {sinGps(p) ? <span className="t-caption text-fg-muted">Sin GPS</span> : null}
              </span>
            ),
          },
          { id: "modo", etiqueta: "Modo", render: (p) => MODO_PUNTO[p.modo] },
          { id: "radio", etiqueta: "Radio", className: "t-numeric", render: (p) => m(p.radioM, "m") },
          {
            id: "precision",
            etiqueta: "Precisión mín.",
            className: "hidden t-numeric lg:table-cell",
            render: (p) => m(p.precisionMinM, "m"),
          },
          {
            id: "permanencia",
            etiqueta: "Permanencia",
            className: "hidden t-numeric lg:table-cell",
            render: (p) => m(p.permanenciaS, "s"),
          },
          {
            id: "estado",
            etiqueta: "Estado",
            render: (p) => (
              <Badge tono={p.estado !== "activo" ? "neutro" : "success"}>
                {p.estado !== "activo" ? "Archivado" : "Activo"}
              </Badge>
            ),
          },
        ]}
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
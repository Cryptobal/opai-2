import { Badge } from "@opai/ds";

import type { ItemHoy } from "./hoy-lista";

import { duracionHoy, ESTADOS_HOY } from "./hoy-util";

export function tarjetaHoy(h: (v: string | null) => string) {
  return function TarjetaHoy(x: ItemHoy) {
    return (
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-base font-medium text-fg">{x.nombre}</span>
          <Badge tono={ESTADOS_HOY[x.estado]?.tono ?? "neutro"}>{ESTADOS_HOY[x.estado]?.etiqueta ?? x.estado}</Badge>
        </span>
        <span className="t-caption">
          {x.instalacion ?? "Sin instalación"} · Turno {h(x.turnoInicio)}–{h(x.turnoFin)} · Entrada {h(x.entrada)}
          {x.atrasoMin > 0 ? ` · Atraso ${duracionHoy(x.atrasoMin)}` : ""}
          {x.correccionPendiente ? " · Corrección pendiente" : ""}
        </span>
      </span>
    );
  };
}

export function columnasHoy(h: (v: string | null) => string) {
  return [
    { id: "persona", etiqueta: "Persona", render: (x: ItemHoy) => x.nombre },
    { id: "instalacion", etiqueta: "Instalación", render: (x: ItemHoy) => x.instalacion ?? "—" },
    { id: "turno", etiqueta: "Turno", render: (x: ItemHoy) => `${h(x.turnoInicio)}–${h(x.turnoFin)}` },
    { id: "entrada", etiqueta: "Entrada", render: (x: ItemHoy) => h(x.entrada) },
    { id: "salida", etiqueta: "Salida", render: (x: ItemHoy) => h(x.salida) },
    { id: "atraso", etiqueta: "Atraso", render: (x: ItemHoy) => (x.atrasoMin > 0 ? duracionHoy(x.atrasoMin) : "—") },
    {
      id: "estado",
      etiqueta: "Estado",
      render: (x: ItemHoy) => (
        <span className="flex flex-wrap items-center gap-1">
          <Badge tono={ESTADOS_HOY[x.estado]?.tono ?? "neutro"}>{ESTADOS_HOY[x.estado]?.etiqueta ?? x.estado}</Badge>
          {x.correccionPendiente ? <Badge tono="info">Corrección pendiente</Badge> : null}
        </span>
      ),
    },
  ];
}
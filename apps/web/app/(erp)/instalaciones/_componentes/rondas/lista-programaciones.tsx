import type { ReactNode } from "react";

import { Badge, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { resumenDias, resumenHorarios } from "./dias";
import type { Plantilla, Programacion } from "./tipos";

/** Lista de programaciones (c13s): plantilla, horarios y días. Abre el drawer `?programacion=`. */
export function ListaProgramaciones({
  state,
  programaciones,
  plantillas,
  accionVacio,
}: {
  state: EstadoPantalla;
  programaciones: readonly Programacion[];
  plantillas: readonly Plantilla[];
  accionVacio?: ReactNode;
}) {
  const nombre = (id: string) => plantillas.find((p) => p.id === id)?.nombre ?? "Plantilla";
  return (
    <div className="@container">
      <ListScreen<Programacion>
        state={state}
        titulo="Programación"
        sinCabecera
        items={programaciones}
        clave={(p) => p.id}
        href={(p) => `?programacion=${p.id}`}
        Link={LinkNext}
        tarjeta={(p) => (
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-medium">{p.nombre}</span>
            <span className="t-caption truncate">
              {nombre(p.plantillaId)} · {resumenHorarios(p.horarios)} · {resumenDias(p.diasSemana)}
            </span>
          </span>
        )}
        columnas={[
          { id: "nombre", etiqueta: "Programación", className: "font-medium", render: (p) => p.nombre },
          { id: "plantilla", etiqueta: "Plantilla", render: (p) => nombre(p.plantillaId) },
          { id: "horarios", etiqueta: "Horarios · días", render: (p) => `${resumenHorarios(p.horarios)} · ${resumenDias(p.diasSemana)}` },
          {
            id: "estado",
            etiqueta: "Estado",
            render: (p) => (
              <Badge tono={p.estado === "activa" ? "success" : "neutro"}>
                {p.estado === "activa" ? "Activa" : "Pausada"}
              </Badge>
            ),
          },
        ]}
        textos={{
          vacio: {
            titulo: "Aún no hay programación",
            descripcion: "Fija cuándo se ejecuta cada plantilla y a quién se asigna.",
            accion: accionVacio,
          },
        }}
      />
    </div>
  );
}

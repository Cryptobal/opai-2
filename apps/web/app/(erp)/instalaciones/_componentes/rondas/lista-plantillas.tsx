import type { ReactNode } from "react";

import { type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { ORDEN_PLANTILLA } from "./etiquetas";
import type { Plantilla } from "./tipos";

/** Lista de plantillas de ronda (c13t): puntos, tiempo máximo y orden. Abre el drawer `?plantilla=`. */
export function ListaPlantillas({
  state,
  plantillas,
  accionVacio,
}: {
  state: EstadoPantalla;
  plantillas: readonly Plantilla[];
  accionVacio?: ReactNode;
}) {
  return (
    <div className="@container">
      <ListScreen<Plantilla>
        state={state}
        titulo="Plantillas"
        sinCabecera
        items={plantillas}
        clave={(p) => p.id}
        href={(p) => `?plantilla=${p.id}`}
        Link={LinkNext}
        tarjeta={(p) => (
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-medium">{p.nombre}</span>
            <span className="t-caption truncate">
              {p.puntos.length} puntos · {p.tiempoMaxMin} min · {ORDEN_PLANTILLA[p.ordenModo]}
            </span>
          </span>
        )}
        columnas={[
          { id: "nombre", etiqueta: "Plantilla", className: "font-medium", render: (p) => p.nombre },
          {
            id: "puntos",
            etiqueta: "Puntos",
            className: "t-numeric",
            render: (p) => String(p.puntos.length),
          },
          {
            id: "tiempo",
            etiqueta: "Tiempo máx.",
            className: "t-numeric",
            render: (p) => `${p.tiempoMaxMin} min`,
          },
          { id: "orden", etiqueta: "Orden", render: (p) => ORDEN_PLANTILLA[p.ordenModo] },
        ]}
        textos={{
          vacio: {
            titulo: "Aún no hay plantillas",
            descripcion: "Arma una plantilla con los puntos, su orden y los tiempos de la ronda.",
            accion: accionVacio,
          },
        }}
      />
    </div>
  );
}

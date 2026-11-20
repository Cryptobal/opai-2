import { Fragment } from "react";
import { Circle, Marker, Popup } from "react-leaflet";

import { LinkNext } from "@/app/_components/link-next";

import type { Punto } from "../tipos";
import { iconoNumero } from "./iconos";

export function MarcadoresPanelPuntos({
  gps,
  defectosRadioM,
  seleccionadoId,
  onSeleccionar,
}: {
  gps: { p: Punto; n: number }[];
  defectosRadioM: number;
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
}) {
  return (
    <>
      {gps.map(({ p, n }) => {
        const lat = p.latitud!;
        const lng = p.longitud!;
        const radio = p.radioM ?? defectosRadioM;
        return (
          <Fragment key={p.id}>
            <Marker
              position={[lat, lng]}
              icon={iconoNumero(n, seleccionadoId === p.id)}
              eventHandlers={{ click: () => onSeleccionar(p.id) }}
            >
              <Popup>
                <span className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">{p.nombre}</span>
                  <LinkNext href={`?punto=${p.id}`} className="text-accent underline">
                    Editar punto
                  </LinkNext>
                </span>
              </Popup>
            </Marker>
            <Circle
              center={[lat, lng]}
              radius={radio}
              pathOptions={{
                color: seleccionadoId === p.id ? "var(--color-fg)" : "var(--color-accent)",
                fillColor: "var(--color-accent)",
                fillOpacity: seleccionadoId === p.id ? 0.18 : 0.1,
              }}
            />
          </Fragment>
        );
      })}
    </>
  );
}
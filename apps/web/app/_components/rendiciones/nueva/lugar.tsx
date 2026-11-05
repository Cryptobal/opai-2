"use client";

import { useState } from "react";

import { Campo, Select } from "@opai/ds";

import { DireccionOpai } from "@/app/_components/maestros/direccion";

import type { InstalacionOpcion, PortalRendicion } from "../tipos";

export type Lugar = { texto: string; lat: number; lng: number };

const OTRA = "__otra__";

/** Origen o destino: una instalación de la empresa o una dirección buscada (lat/lng salen de `core.geo.*`). */
export function CampoLugar({
  etiqueta,
  id,
  valor,
  onCambiar,
  instalaciones,
  portal,
}: {
  etiqueta: string;
  id: string;
  valor: Lugar | null;
  onCambiar: (l: Lugar | null) => void;
  instalaciones: readonly InstalacionOpcion[];
  portal: PortalRendicion;
}) {
  const conUbicacion = instalaciones.filter((i) => i.lat !== null && i.lng !== null);
  const [fuente, setFuente] = useState<string>(OTRA);
  const [direccion, setDireccion] = useState<{
    calle: string;
    direccionFormateada?: string | null;
    lat?: number | null;
    lng?: number | null;
  } | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <Campo etiqueta={etiqueta} htmlFor={id}>
        <Select
          id={id}
          valor={fuente}
          opciones={[
            { valor: OTRA, etiqueta: "Buscar una dirección" },
            ...conUbicacion.map((i) => ({ valor: i.id, etiqueta: i.nombre })),
          ]}
          onCambiar={(v) => {
            setFuente(v);
            const inst = conUbicacion.find((i) => i.id === v);
            onCambiar(inst ? { texto: inst.nombre, lat: inst.lat ?? 0, lng: inst.lng ?? 0 } : null);
            setDireccion(null);
          }}
        />
      </Campo>
      {fuente === OTRA ? (
        <DireccionOpai
          portal={portal}
          sinMapa
          valor={direccion}
          onCambiar={(d) => {
            setDireccion(d);
            onCambiar(
              d && d.lat != null && d.lng != null
                ? { texto: d.direccionFormateada ?? d.calle, lat: d.lat, lng: d.lng }
                : null,
            );
          }}
        />
      ) : null}
      {valor ? <p className="t-caption">{valor.texto}</p> : null}
    </div>
  );
}

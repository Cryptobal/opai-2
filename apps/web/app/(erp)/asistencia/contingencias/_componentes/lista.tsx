"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatearFechaHora } from "@opai/domain";

import { Badge, Button, type EstadoPantalla, ListScreen } from "@opai/ds";

import { RegistrarContingencia } from "./registrar";

export type Fila = {
  id: string;
  personaNombre: string;
  instalacionNombre: string;
  tipoEtiqueta: string;
  horaDeclarada: string;
  motivo: string;
  estado: "pendiente" | "aceptada" | "rechazada";
};

const TONO: Record<Fila["estado"], "warning" | "success" | "danger"> = {
  pendiente: "warning",
  aceptada: "success",
  rechazada: "danger",
};

export function ListaContingencias({ state, items, zona }: { state: EstadoPantalla; items: Fila[]; zona: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const hora = (iso: string) => formatearFechaHora(iso, zona);
  return (
    <>
      <ListScreen<Fila>
        state={state}
        titulo="Contingencias"
        subtitulo="Marcas cuando el sistema no estuvo disponible."
        accionPrincipal={<Button onClick={() => setAbierto(true)}>Registrar marca</Button>}
        items={items}
        clave={(x) => x.id}
        columnas={[
          { id: "persona", etiqueta: "Trabajador", render: (x) => x.personaNombre },
          {
            id: "marca",
            etiqueta: "Marca",
            render: (x) => `${x.tipoEtiqueta} · ${hora(x.horaDeclarada)}`,
          },
          { id: "inst", etiqueta: "Instalación", render: (x) => x.instalacionNombre },
          {
            id: "estado",
            etiqueta: "Estado",
            render: (x) => <Badge tono={TONO[x.estado]}>{x.estado}</Badge>,
          },
        ]}
        tarjeta={(x) => (
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-base font-medium text-fg">{x.personaNombre}</span>
            <span className="t-caption">
              {x.tipoEtiqueta} · {x.instalacionNombre}
            </span>
            <span className="t-caption muted">{x.motivo}</span>
            <Badge tono={TONO[x.estado]}>{x.estado}</Badge>
          </span>
        )}
      />
      <RegistrarContingencia abierto={abierto} onCerrar={() => setAbierto(false)} onListo={() => router.refresh()} />
    </>
  );
}
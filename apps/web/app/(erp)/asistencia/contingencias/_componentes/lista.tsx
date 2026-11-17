"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const hora = new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: zona, hourCycle: "h23" });
  return (
    <>
      <ListScreen<Fila>
        state={state}
        titulo="Contingencias"
        subtitulo="Marcas cuando el sistema no estuvo disponible."
        acciones={<Button onClick={() => setAbierto(true)}>Registrar marca</Button>}
        items={items}
        clave={(x) => x.id}
        columnas={[
          { id: "persona", cabecera: "Trabajador", celda: (x) => x.personaNombre },
          { id: "marca", cabecera: "Marca", celda: (x) => `${x.tipoEtiqueta} · ${hora.format(new Date(x.horaDeclarada))}` },
          { id: "inst", cabecera: "Instalación", celda: (x) => x.instalacionNombre },
          { id: "estado", cabecera: "Estado", celda: (x) => <Badge tono={TONO[x.estado]}>{x.estado}</Badge> },
        ]}
        tarjeta={(x) => ({
          titulo: x.personaNombre,
          subtitulo: `${x.tipoEtiqueta} · ${x.instalacionNombre}`,
          detalle: x.motivo,
          pie: <Badge tono={TONO[x.estado]}>{x.estado}</Badge>,
        })}
      />
      <RegistrarContingencia abierto={abierto} onCerrar={() => setAbierto(false)} onListo={() => router.refresh()} />
    </>
  );
}
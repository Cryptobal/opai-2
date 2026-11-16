"use client";

import { Button, type Columna, ListScreen } from "@opai/ds";

import type { PlantillaRonda } from "./tipos";

const COLUMNAS: readonly Columna<PlantillaRonda>[] = [
  { id: "nombre", etiqueta: "Ronda", render: (p) => <span className="font-medium">{p.nombre}</span> },
  {
    id: "puntos",
    etiqueta: "Puntos",
    className: "text-right",
    render: (p) => <span className="t-numeric">{p.puntos.length}</span>,
  },
];

/** Plantillas para iniciar una ronda en terreno (ListScreen, CAR-589). */
export function ListaPlantillas({
  plantillas,
  alIniciar,
}: {
  plantillas: PlantillaRonda[];
  alIniciar: (id: string) => void;
}) {
  return (
    <ListScreen
      state="ready"
      titulo="Iniciar una ronda"
      items={plantillas}
      clave={(p) => p.id}
      columnas={COLUMNAS}
      tarjeta={(p) => (
        <span className="flex flex-col">
          <span className="text-base text-fg">{p.nombre}</span>
          <span className="text-sm text-fg-muted">{p.puntos.length} puntos</span>
        </span>
      )}
      acciones={(p) => <Button onClick={() => alIniciar(p.id)}>Iniciar</Button>}
      textos={{
        vacio: {
          titulo: "No hay rondas para iniciar",
          descripcion: "Esta instalación no tiene rondas que se puedan iniciar desde el teléfono.",
        },
      }}
    />
  );
}
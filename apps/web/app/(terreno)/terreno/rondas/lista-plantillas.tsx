"use client";

import { Button, Empty } from "@opai/ds";

import type { PlantillaRonda } from "./tipos";

/** Las rondas que se pueden iniciar desde el teléfono (CAR-78 · E3e). */
export function ListaPlantillas({
  plantillas,
  alIniciar,
}: {
  plantillas: PlantillaRonda[];
  alIniciar: (id: string) => void;
}) {
  return (
    <section aria-label="Iniciar ronda" className="flex flex-col gap-2">
      <h2 className="t-heading text-fg">Iniciar una ronda</h2>
      {plantillas.length === 0 ? (
        <Empty
          titulo="No hay rondas para iniciar"
          descripcion="Esta instalación no tiene rondas que se puedan iniciar desde el teléfono."
        />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface">
          {plantillas.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="flex flex-col">
                <span className="text-base text-fg">{p.nombre}</span>
                <span className="text-sm text-fg-muted">{p.puntos.length} puntos</span>
              </span>
              <Button onClick={() => alIniciar(p.id)}>Iniciar</Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

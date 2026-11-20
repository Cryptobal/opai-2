"use client";

import { Button, Checkbox } from "@opai/ds";

export type CandidataMasivo = {
  personaId: string;
  nombre: string;
  descripcion: string;
  puedeGenerar: boolean;
  motivoBloqueo: string | null;
};

type Props = {
  candidatas: CandidataMasivo[];
  seleccion: Set<string>;
  elegidas: number;
  onToggle: (personaId: string, marcado: boolean) => void;
  onPrevisualizar: (personaId: string) => void;
};

export function ListaCandidatasMasivo({ candidatas, seleccion, elegidas, onToggle, onPrevisualizar }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <span className="t-label">
        Personas · {elegidas} elegidas de {candidatas.length}
      </span>
      <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
        {candidatas.map((p) => (
          <li key={p.personaId} className="flex items-start gap-2 border-b border-border py-2 last:border-0">
            <Checkbox
              soloControl
              etiqueta={`Seleccionar a ${p.nombre}`}
              marcado={seleccion.has(p.personaId)}
              disabled={!p.puedeGenerar}
              onCambiar={(v) => onToggle(p.personaId, v)}
            />
            <Button
              type="button"
              variant="ghost"
              className="h-auto min-w-0 flex-1 justify-start px-2 py-1 text-left font-normal"
              onClick={() => onPrevisualizar(p.personaId)}
            >
              <span className="block w-full truncate font-medium">{p.nombre}</span>
              <span className="t-caption text-fg-muted">{p.descripcion}</span>
              {p.motivoBloqueo ? <span className="t-caption text-warning-fg">{p.motivoBloqueo}</span> : null}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
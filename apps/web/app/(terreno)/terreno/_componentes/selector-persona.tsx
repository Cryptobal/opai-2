"use client";

import { FilaSeleccionable, MonoAv } from "@opai/ds";

import type { PersonaDeLista } from "@/lib/terreno-servidor";
import { elegirPersona } from "@/lib/terreno/persona";

/** «¿Quién eres?» (g1): el teléfono es de la instalación; cada guardia elige su nombre al empezar. */
export function SelectorPersona({
  instalacion,
  personas,
}: {
  instalacion: string;
  personas: PersonaDeLista[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="t-title text-fg">¿Quién eres?</h1>
        <p className="mt-1 text-base text-fg-muted">
          Este teléfono está asignado a {instalacion || "tu instalación"}. Elige tu nombre para
          empezar.
        </p>
      </div>
      {personas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-base text-fg-muted">
          Todavía no hay nadie asignado a esta instalación. Avísale a tu supervisor.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface">
          {personas.map((p) => (
            <li key={p.id}>
              <FilaSeleccionable
                titulo={p.nombre}
                secundario={p.cargo}
                inicio={<MonoAv texto={p.iniciales} />}
                onClick={() => elegirPersona({ id: p.id, nombre: p.nombre })}
              />
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-fg-muted">¿No estás en la lista? Avísale a tu supervisor.</p>
    </div>
  );
}

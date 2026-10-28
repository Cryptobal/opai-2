"use client";

import { Button, Campo, Combobox, type OpcionCombobox } from "@opai/ds";

export type FilaACargo = { id: string; nombre: string; detalle?: string };

/**
 * Lista de lo que está a cargo de un supervisor (CAR-38): instalaciones en la ficha del usuario o
 * supervisores en la de la instalación. Una fila por elemento con «Quitar» (≥44 px); sin filas,
 * el estado vacío explica la consecuencia (el supervisor ve listas vacías, ADR-022).
 */
export function FilasACargo(p: {
  items: readonly FilaACargo[];
  vacio: string;
  pendiente: boolean;
  onQuitar?: ((id: string) => void) | undefined;
}) {
  if (!p.items.length) {
    return <p className="rounded-md bg-fill px-4 py-3 text-base text-fg-muted">{p.vacio}</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {p.items.map((f) => (
        <li key={f.id} className="flex min-h-11 items-center gap-3 py-1 pl-4 pr-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium text-fg">{f.nombre}</p>
            {f.detalle ? <p className="t-caption truncate">{f.detalle}</p> : null}
          </div>
          {p.onQuitar ? (
            <Button
              variant="ghost"
              disabled={p.pendiente}
              aria-label={`Quitar ${f.nombre}`}
              onClick={() => p.onQuitar?.(f.id)}
            >
              Quitar
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Buscador múltiple y botón «Asignar»: lo elegido se agrega de una vez (repetir no duplica). */
export function AsignarACargo(p: {
  id: string;
  etiqueta: string;
  placeholder: string;
  opciones: readonly OpcionCombobox[];
  onBuscar?: (q: string) => Promise<readonly OpcionCombobox[]>;
  elegidos: readonly string[];
  onCambiar: (v: string[]) => void;
  onAsignar: () => void;
  pendiente: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Campo etiqueta={p.etiqueta} htmlFor={p.id}>
        <Combobox
          id={p.id}
          opciones={p.opciones}
          {...(p.onBuscar ? { onBuscar: p.onBuscar } : {})}
          valores={p.elegidos}
          onCambiar={p.onCambiar}
          placeholder={p.placeholder}
        />
      </Campo>
      <Button
        variant="secondary"
        className="self-start"
        disabled={p.pendiente || !p.elegidos.length}
        onClick={p.onAsignar}
      >
        {p.pendiente ? "Guardando…" : p.elegidos.length > 1 ? `Asignar ${p.elegidos.length}` : "Asignar"}
      </Button>
    </div>
  );
}

"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import { AccesoRapido } from "./acceso-rapido";
import type { ItemFijado } from "./fijados";
import { esActivo } from "./types";
import { unirAccesos } from "./unir-accesos";

const MAXIMO_ACCESOS = 4;
const MAXIMO_FIJADOS = 5;

/** Fijados primero y luego recientes, sin repetir destino ni nombre y hasta cuatro accesos (CAR-224). */
export function baldosasDeAcceso(
  fijados: readonly ItemFijado[],
  recientes: readonly ItemFijado[],
): ItemFijado[] {
  return unirAccesos(fijados, recientes, MAXIMO_ACCESOS);
}

type Props = {
  items: readonly ItemFijado[];
  rutaActual?: string;
  onNavegar: (href: string) => void;
  /** Rutas fijadas: llevan pin y solo ellas se pueden desfijar (los recientes se pueden fijar). */
  fijados?: ReadonlySet<string>;
  onDesfijar?: (href: string) => void;
  onFijar?: (item: ItemFijado) => void;
  error?: boolean;
  reintentar?: () => void;
};

/**
 * Fila «Fijados y recientes» (una sola vez, bajo la búsqueda): hasta cuatro accesos rápidos en una
 * tira horizontal; «Editar» muestra el botón de fijar o desfijar de 44 px. Sin accesos, una línea de ayuda.
 */
export function RecientesMas({ items, rutaActual, onNavegar, fijados, onDesfijar, onFijar, error, reintentar }: Props) {
  const [editando, setEditando] = useState(false);
  const esFijado = (i: ItemFijado) => Boolean(fijados?.has(i.href));
  const accionDe = (i: ItemFijado) =>
    esFijado(i) && onDesfijar
      ? { accion: "desfijar" as const, onAccion: () => onDesfijar(i.href) }
      : !esFijado(i) && onFijar && (fijados?.size ?? 0) < MAXIMO_FIJADOS
        ? { accion: "fijar" as const, onAccion: () => onFijar(i) }
        : null;
  const editable = items.some((i) => accionDe(i) !== null);
  return (
    <section aria-labelledby="mas-recientes" className="flex flex-col">
      <div className="flex min-h-8 items-center justify-between pr-2 pl-4">
        <h2 id="mas-recientes" className="t-overline">
          Fijados y recientes
        </h2>
        {editable || editando ? (
          <button
            type="button"
            aria-pressed={editando}
            onClick={() => setEditando((v) => !v)}
            className="flex min-h-11 items-center rounded-md px-2 t-label text-accent outline-none focus-visible:outline-2 focus-visible:outline-focus"
          >
            {editando ? "Listo" : "Editar"}
          </button>
        ) : null}
      </div>
      {error ? (
        <div
          role="alert"
          className="mx-4 flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface py-0 pr-1 pl-3 t-body-sm text-fg-muted"
        >
          <TriangleAlert className="size-4 flex-none text-danger-fg" aria-hidden />
          <span className="flex-1">No pudimos cargar tus fijados</span>
          <button
            type="button"
            onClick={reintentar}
            className="min-h-11 rounded-md px-3 t-label text-accent outline-none focus-visible:outline-2 focus-visible:outline-focus"
          >
            Reintentar
          </button>
        </div>
      ) : null}
      {items.length === 0 && !error ? (
        <p className="px-4 py-2 t-body-sm text-fg-muted">
          Aquí aparecen las páginas que visitas y las que fijas.
        </p>
      ) : items.length === 0 ? null : (
        <ul
          className="m-0 flex list-none gap-2 overflow-x-auto px-4 pt-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const edicion = editando ? accionDe(item) : null;
            return (
              <li key={item.href} className="flex min-w-0 flex-none">
                <AccesoRapido
                  item={item}
                  fijado={esFijado(item)}
                  activo={rutaActual !== undefined && esActivo(rutaActual, item.href)}
                  onNavegar={onNavegar}
                  {...(edicion ? { edicion } : {})}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

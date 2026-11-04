"use client";

import { Clock, Search } from "lucide-react";

import { Button } from "../components/button";
import type { ItemFijado } from "./fijados";
import { esActivo } from "./types";

const MAXIMO_BALDOSAS = 4;

/** Fijados primero y luego recientes, sin repetir la ruta y hasta cuatro baldosas (diseño «Más», CAR-182). */
export function baldosasDeAcceso(
  fijados: readonly ItemFijado[],
  recientes: readonly ItemFijado[],
): ItemFijado[] {
  const vistos = new Set<string>();
  const lista: ItemFijado[] = [];
  for (const item of [...fijados, ...recientes]) {
    if (vistos.has(item.href)) continue;
    vistos.add(item.href);
    lista.push(item);
    if (lista.length === MAXIMO_BALDOSAS) break;
  }
  return lista;
}

/** Campo de búsqueda del menú «Más»: abre la búsqueda global (⌘K) igual que la barra superior. */
export function BuscadorMas({ onBuscar }: { onBuscar: () => void }) {
  return (
    <Button
      variant="ghost"
      className="h-11 w-full justify-start gap-2.5 rounded-xl border border-border-strong bg-surface px-3.5 text-md font-normal text-fg-subtle"
      onClick={onBuscar}
    >
      <Search className="size-5 flex-none" aria-hidden />
      <span className="truncate">Buscar módulos, personas, documentos…</span>
    </Button>
  );
}

/** Fila «Recientes y fijados»: cuatro baldosas de acceso rápido; sin ninguna, una línea de ayuda. */
export function RecientesMas({
  items,
  rutaActual,
  onNavegar,
  error,
  reintentar,
}: {
  items: readonly ItemFijado[];
  rutaActual?: string;
  onNavegar: (href: string) => void;
  error?: boolean;
  reintentar?: () => void;
}) {
  return (
    <section aria-labelledby="mas-recientes" className="flex flex-col gap-2">
      <h2 id="mas-recientes" className="t-label-sm px-1 text-fg">
        Recientes y fijados
      </h2>
      {error ? (
        <p role="alert" className="t-caption px-1">
          No pudimos cargar tus fijados.{" "}
          <Button variant="ghost" className="inline-flex h-11 px-1 underline" onClick={reintentar}>
            Reintentar
          </Button>
        </p>
      ) : null}
      {items.length === 0 && !error ? (
        <p className="t-caption px-1">Aquí aparecen las páginas que visitas y las que fijas.</p>
      ) : items.length === 0 ? null : (
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => {
            const Icono = item.icono ?? Clock;
            const activo = rutaActual !== undefined && esActivo(rutaActual, item.href);
            return (
              <Button
                key={item.href}
                variant="ghost"
                className="h-20 min-w-0 flex-col justify-center gap-1.5 rounded-2xl border border-border bg-surface px-0.5 py-2 text-center text-xs leading-[14px] font-medium break-words whitespace-normal text-fg"
                aria-current={activo ? "page" : undefined}
                onClick={() => onNavegar(item.href)}
              >
                <span className="flex size-8 items-center justify-center rounded-[10px] bg-accent-muted text-accent">
                  <Icono className="size-4" aria-hidden />
                </span>
                <span className="line-clamp-2">{item.etiqueta}</span>
              </Button>
            );
          })}
        </div>
      )}
    </section>
  );
}

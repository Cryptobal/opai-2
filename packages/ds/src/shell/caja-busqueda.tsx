"use client";

import { Search } from "lucide-react";

import { cn } from "../cn";
import { AtajoBusqueda } from "../components/atajo-busqueda";

type Props = {
  onBuscar: () => void;
  compacta?: boolean | undefined;
  /** Texto propio (diseño nuevo: «Busca o pídele algo a OPAI») en todos los anchos de la barra. */
  texto?: string | undefined;
};

/** Caja de búsqueda ⌘K de la barra de iPad y desktop; `data-shell="buscar"` la ubica en el diseño nuevo. */
export function CajaBusqueda({ onBuscar, compacta, texto }: Props) {
  return (
    <div data-shell="buscar" className="flex min-w-0 flex-none">
      <button
        type="button"
        onClick={onBuscar}
        aria-label="Buscar o ir a"
        className={cn(
          "flex h-11 min-w-0 items-center gap-2 rounded-md border border-border bg-surface px-3 text-base text-fg-subtle outline-none hover:border-border-strong focus-visible:outline-2 focus-visible:outline-focus xl:h-9",
          // En iPad (768–1023 px) la caja más angosta deja sitio al título aun con el botón del agente a la vista.
          compacta ? "w-auto" : "w-[200px] lg:w-[280px] xl:w-80",
        )}
      >
        <Search className="size-4 flex-none" aria-hidden />
        <span className={cn("flex-1 truncate text-left xl:hidden", compacta && "hidden")}>
          {texto ?? "Buscar personas, clientes, folios"}
        </span>
        <span className={cn("hidden flex-1 text-left xl:inline", compacta && "xl:hidden")}>
          {texto ?? "Buscar"}
        </span>
        <AtajoBusqueda className="hidden xl:inline-flex" />
      </button>
    </div>
  );
}

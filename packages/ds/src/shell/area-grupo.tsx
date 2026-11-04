"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useId } from "react";

import { cn } from "../cn";

type Props = {
  etiqueta: string;
  icono: LucideIcon;
  abierto: boolean;
  /** El área contiene la página activa (así, plegada, su icono lleva el acento, D1). */
  activa: boolean;
  onAlternar: () => void;
  children: React.ReactNode;
};

/**
 * Encabezado de área plegable (D1, §8.2.1): botón de 44 px con chevron y `aria-expanded`; el
 * contenido pliega y abre con una transición de 150–200 ms (`prefers-reduced-motion` lo apaga).
 */
export function AreaGrupo({
  etiqueta,
  icono: Icono,
  abierto,
  activa,
  onAlternar,
  children,
}: Props) {
  const id = useId();
  return (
    <div className="flex flex-col gap-px">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierto}
        aria-controls={id}
        className={cn(
          "flex h-11 items-center gap-2.5 rounded-md px-2 text-base font-medium outline-none hover:bg-fill hover:text-fg focus-visible:outline-2 focus-visible:outline-focus",
          // El área de la página actual se distingue aunque esté plegada: texto fuerte, fondo y acento.
          activa ? "bg-fill font-semibold text-fg" : "text-fg-muted",
        )}
      >
        <Icono className={cn("size-4 flex-none", activa && "text-accent")} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{etiqueta}</span>
        {abierto ? (
          <ChevronDown className="size-4 flex-none text-fg-subtle" aria-hidden />
        ) : (
          <ChevronRight className="size-4 flex-none text-fg-subtle" aria-hidden />
        )}
      </button>
      <div
        id={id}
        inert={!abierto}
        aria-hidden={!abierto}
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-200 motion-reduce:transition-none",
          abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="flex min-h-0 flex-col gap-px overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

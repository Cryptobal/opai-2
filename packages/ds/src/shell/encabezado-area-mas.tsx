"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";

import { cn } from "../cn";

type Props = {
  nombre: string;
  icono: LucideIcon;
  cantidad: number;
  abierta: boolean;
  /** La página actual está en el área (se marca aunque esté plegada). */
  contienePaginaActual?: boolean;
  /** Id de la lista que controla (`aria-controls`). */
  controla: string;
  onAlternar: () => void;
};

/**
 * Encabezado de área del menú «Más» (CAR-182, lámina 20): fila de 48 px con ícono del área, nombre,
 * conteo de entradas y chevron. Pliega y despliega su lista (`aria-expanded`); el título es un `h2`.
 */
export function EncabezadoAreaMas(p: Props) {
  return (
    <h2 className="m-0">
      <button
        type="button"
        aria-expanded={p.abierta}
        aria-controls={p.controla}
        onClick={p.onAlternar}
        className="flex h-12 w-full items-center gap-3 rounded-md pr-3 pl-2 text-left t-body font-semibold text-fg outline-none transition-colors duration-150 hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
      >
        <p.icono className="size-5 flex-none text-fg-muted" aria-hidden />
        <span className="min-w-0 truncate">{p.nombre}</span>
        {p.contienePaginaActual && !p.abierta ? (
          <>
            <span aria-hidden className="size-2 flex-none rounded-full bg-accent" />
            <span className="sr-only">Contiene la página actual</span>
          </>
        ) : null}
        <span className="t-caption ml-auto flex-none">
          {p.cantidad} {p.cantidad === 1 ? "entrada" : "entradas"}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-5 flex-none text-fg-subtle transition-transform duration-200 motion-reduce:transition-none",
            p.abierta && "rotate-180",
          )}
        />
      </button>
    </h2>
  );
}

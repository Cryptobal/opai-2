"use client";

import { ChevronRight } from "lucide-react";

import { cn } from "../cn";
import type { FilaPlanilla } from "./planilla-screen-types";

const SANGRIA = { 0: "pl-3", 1: "pl-8", 2: "pl-13" } as const;

/**
 * Cabecera fija de una fila de la planilla. Las filas `plegable` traen un botón para abrir su detalle
 * (por ejemplo, los ingresos por cliente y sus instalaciones); las hijas van con sangría y texto secundario.
 */
export function CabeceraFila({ fila, onAlternar }: { fila: FilaPlanilla; onAlternar?: (filaId: string) => void }) {
  const nivel = fila.nivel ?? 0;
  const hija = nivel > 0;
  const plegable = fila.plegable && onAlternar ? fila.plegable : null;
  return (
    <th
      className={cn(
        "sticky left-0 z-10 max-w-72 border-r border-b border-border bg-surface py-1.5 pr-3 text-left",
        SANGRIA[nivel],
        hija ? "text-sm font-normal text-fg-muted" : "text-base font-medium text-fg",
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        {plegable ? (
          <button
            type="button"
            aria-expanded={plegable.abierta}
            aria-label={`${plegable.abierta ? "Ocultar" : "Ver"} detalle de ${fila.etiqueta}`}
            onClick={() => onAlternar?.(fila.id)}
            // Área de toque de 44 px (iPad usa esta vista); el ícono sigue chico.
            className="-my-2 -ml-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-fg-subtle hover:bg-fill hover:text-fg focus-visible:outline-2 focus-visible:outline-focus"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "size-4 transition-transform duration-150 motion-reduce:transition-none",
                plegable.abierta && "rotate-90",
              )}
            />
          </button>
        ) : null}
        <div className="min-w-0">
          <div className="truncate">{fila.etiqueta}</div>
          {fila.sub ? <div className="truncate text-xs font-normal text-fg-muted">{fila.sub}</div> : null}
        </div>
      </div>
    </th>
  );
}

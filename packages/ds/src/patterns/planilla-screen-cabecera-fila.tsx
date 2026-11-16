"use client";

import { ChevronRight } from "lucide-react";

import { cn } from "../cn";
import { claseFondoFila, type FilaPlanilla } from "./planilla-screen-types";

const SANGRIA = { 0: "pl-3", 1: "pl-8", 2: "pl-13" } as const;

/** Área de toque de 44 px; el ícono sigue chico. En el teléfono el scroll deja el botón sobre la barra. */
function BotonPlegar({ abierta, etiqueta, onClick }: { abierta: boolean; etiqueta: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={abierta}
      aria-label={`${abierta ? "Ocultar" : "Ver"} detalle de ${etiqueta}`}
      onClick={onClick}
      className="-my-2 -ml-2 flex size-11 shrink-0 cursor-pointer scroll-mb-24 items-center justify-center rounded-sm text-fg-subtle hover:bg-fill hover:text-fg focus-visible:outline-2 focus-visible:outline-focus md:scroll-mb-0"
    >
      <ChevronRight
        aria-hidden
        className={cn("size-4 transition-transform duration-150 motion-reduce:transition-none", abierta && "rotate-90")}
      />
    </button>
  );
}

/**
 * Cabecera fija de una fila de la planilla. Las filas `plegable` traen un botón para abrir su detalle
 * (por ejemplo, los ingresos por cliente y sus instalaciones); las hijas van con sangría y texto secundario.
 */
export function CabeceraFila({
  fila,
  onAlternar,
  onAccion,
}: {
  fila: FilaPlanilla;
  onAlternar?: ((filaId: string) => void) | undefined;
  onAccion?: ((filaId: string) => void) | undefined;
}) {
  const nivel = fila.nivel ?? 0;
  const plegable = fila.plegable && onAlternar ? fila.plegable : null;
  const encabezado = nivel === 0 || Boolean(plegable) || Boolean(fila.total);
  return (
    <th
      className={cn(
        "sticky left-0 z-10 w-36 min-w-36 max-w-36 overflow-hidden border-r border-b border-border py-1.5 pr-3 text-left md:w-auto md:min-w-40 md:max-w-72",
        claseFondoFila(fila),
        SANGRIA[nivel],
        fila.total && "border-t",
        encabezado ? "text-base font-medium text-fg" : "text-sm font-normal text-fg-muted",
        fila.total && "font-semibold",
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        {plegable ? (
          <BotonPlegar abierta={plegable.abierta} etiqueta={fila.etiqueta} onClick={() => onAlternar?.(fila.id)} />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate">{fila.etiqueta}</div>
          {fila.sub ? <div className="truncate text-xs font-normal text-fg-muted">{fila.sub}</div> : null}
        </div>
        {fila.accion && onAccion ? (
          <button
            type="button"
            aria-label={`${fila.accion} ${fila.etiqueta}`}
            onClick={() => onAccion(fila.id)}
            // La acción vive en su fila (CAR-456): aparece al pasar el mouse o con foco; en pantallas táctiles, siempre.
            className="-my-2 flex min-h-11 shrink-0 cursor-pointer items-center rounded-sm px-2 text-xs font-medium text-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-fill focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-focus motion-reduce:transition-none [@media(hover:none)]:opacity-100"
          >
            {fila.accion}
          </button>
        ) : null}
      </div>
    </th>
  );
}
"use client";

import { Pin, PinOff } from "lucide-react";

import { cn } from "../cn";

type Props = {
  fijado: boolean;
  onFijar: () => void;
  /** En la fila de la barra lateral: icono de 24 px, visible en hover/foco. En la cabecera de la
   *  ficha: botón secundario con texto ("Fijar"/"Fijada"), siempre visible (§8.2.3). */
  variante?: "fila" | "ficha";
  className?: string;
};

/**
 * Pin para fijar/desfijar (D3, §8.2.3): en la fila del menú aparece al pasar el mouse o con foco de
 * teclado; en la cabecera de una ficha es un botón secundario permanente. El ícono es Lucide
 * (`Pin`/`PinOff`); no está en el set de 55 del export.
 */
export function BotonFijar({ fijado, onFijar, variante = "fila", className }: Props) {
  const etiqueta = fijado ? "Desfijar" : "Fijar";
  if (variante === "ficha") {
    return (
      <button
        type="button"
        onClick={onFijar}
        aria-pressed={fijado}
        className={cn(
          "btn btn-secondary inline-flex h-11 items-center gap-2 rounded-md border border-border px-3 text-base font-medium outline-none focus-visible:outline-2 focus-visible:outline-focus",
          fijado ? "text-accent" : "text-fg",
          className,
        )}
      >
        {fijado ? (
          <PinOff className="size-4" aria-hidden />
        ) : (
          <Pin className="size-4" aria-hidden />
        )}
        {etiqueta}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onFijar}
      aria-label={etiqueta}
      className={cn(
        "ml-auto flex size-11 flex-none items-center justify-center rounded-md text-fg-muted opacity-0 outline-none hover:bg-fill focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-focus group-hover:opacity-100 [@media(hover:none)]:opacity-100",
        className,
      )}
    >
      {fijado ? <PinOff className="size-4" aria-hidden /> : <Pin className="size-4" aria-hidden />}
    </button>
  );
}

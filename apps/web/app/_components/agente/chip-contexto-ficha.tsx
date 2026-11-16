"use client";

import { X } from "lucide-react";

import { Button } from "@opai/ds";

/** Chip «Sobre …» con opción de quitar el contexto de ficha en el panel. */
export function ChipContextoFicha({
  etiqueta,
  onQuitar,
}: {
  etiqueta: string;
  onQuitar: () => void;
}) {
  return (
    <p
      data-testid="agente-contexto-ficha"
      className="t-caption flex flex-none items-center justify-between gap-2 border-t border-border px-3 py-1"
    >
      <span className="truncate">Sobre {etiqueta}</span>
      <Button variant="ghost" aria-label="Quitar la ficha" className="size-11 p-0" onClick={onQuitar}>
        <X className="size-4" aria-hidden />
      </Button>
    </p>
  );
}
"use client";

import { Button } from "@opai/ds";

import { nombreMes } from "./etiquetas";

type Props = { anio: number; mes: number; onCambiar: (delta: number) => void };

export function NavegacionMes({ anio, mes, onCambiar }: Props) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="iconSm" aria-label="Mes anterior" onClick={() => onCambiar(-1)}>
        ‹
      </Button>
      <span className="t-label min-w-36 text-center first-letter:uppercase" aria-live="polite">
        {nombreMes(anio, mes)}
      </span>
      <Button variant="ghost" size="iconSm" aria-label="Mes siguiente" onClick={() => onCambiar(1)}>
        ›
      </Button>
    </div>
  );
}
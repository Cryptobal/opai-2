"use client";

import { Minus, Plus } from "lucide-react";

import { Button, cn } from "@opai/ds";

import { DIAS_SEMANA } from "./tipos";

/** Contador táctil de 44 px (días de trabajo / descanso). */
export function Contador({
  etiqueta,
  valor,
  onCambiar,
  min = 1,
  max = 28,
  deshabilitado,
}: {
  etiqueta: string;
  valor: number;
  onCambiar: (v: number) => void;
  min?: number;
  max?: number;
  deshabilitado?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="t-label text-fg">{etiqueta}</span>
      <div className="flex items-center gap-1" role="group" aria-label={etiqueta}>
        <Button
          variant="secondary"
          size="icon"
          aria-label={`Disminuir ${etiqueta.toLowerCase()}`}
          disabled={deshabilitado || valor <= min}
          onClick={() => onCambiar(Math.max(min, valor - 1))}
        >
          <Minus aria-hidden className="size-4" />
        </Button>
        <span className="t-title t-numeric min-w-11 text-center" aria-live="polite">
          {valor}
        </span>
        <Button
          variant="secondary"
          size="icon"
          aria-label={`Aumentar ${etiqueta.toLowerCase()}`}
          disabled={deshabilitado || valor >= max}
          onClick={() => onCambiar(Math.min(max, valor + 1))}
        >
          <Plus aria-hidden className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** Vista del ciclo de un cíclico (T trabajo relleno, D descanso contorno), solo lectura. */
export function PreviewCiclo({ trabajo, descanso }: { trabajo: number; descanso: number }) {
  const total = trabajo + descanso;
  return (
    <div
      role="img"
      aria-label={`Ciclo de ${total} días: ${trabajo} de trabajo y ${descanso} de descanso`}
      className="grid grid-cols-7 gap-1"
    >
      {Array.from({ length: total }, (_, i) => {
        const t = i < trabajo;
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              "flex h-11 min-w-11 items-center justify-center rounded-md text-md font-semibold",
              t
                ? "bg-accent text-accent-fg"
                : "border border-control bg-surface text-fg",
            )}
          >
            {t ? "T" : "D"}
          </span>
        );
      })}
    </div>
  );
}

/** Días de la semana de un patrón semanal: botones de 44 px, acento si está seleccionado. */
export function Semana({
  dias,
  onCambiar,
  deshabilitado,
}: {
  dias: number[];
  onCambiar: (d: number[]) => void;
  deshabilitado?: boolean;
}) {
  const alternar = (d: number) =>
    onCambiar(dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d].sort((a, b) => a - b));
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Días de la semana">
      {DIAS_SEMANA.map((etq, i) => {
        const d = i + 1;
        const on = dias.includes(d);
        return (
          <Button
            key={d}
            variant={on ? "primary" : "secondary"}
            size="icon"
            aria-pressed={on}
            aria-label={`${etq}: ${on ? "trabajo" : "descanso"}`}
            disabled={deshabilitado}
            onClick={() => alternar(d)}
            className="text-sm font-semibold"
          >
            {etq}
          </Button>
        );
      })}
    </div>
  );
}

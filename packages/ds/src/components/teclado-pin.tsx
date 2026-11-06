"use client";

import { Delete } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";

import { cn } from "../cn";

export type TecladoPinProps = {
  /** Dígitos ingresados hasta ahora. */
  valor: string;
  onCambiar: (valor: string) => void;
  /** Largo del PIN (6 en OPAI). */
  largo?: number;
  disabled?: boolean;
  /** Pinta los puntos en `danger` (PIN incorrecto). */
  error?: boolean;
  /** Nombre del campo oculto para enviarlo con un `<form>`. */
  name?: string;
  /** Texto para lectores de pantalla del grupo. */
  etiqueta?: string;
  className?: string;
};

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * Teclado numérico para PIN (export-acceso 06 y 07): puntos que se llenan y teclas de 56 px o más
 * (≥ 44 px de objetivo táctil). También acepta el teclado físico. El valor viaja en un campo oculto
 * `name`; nunca se muestra en claro.
 */
export function TecladoPin({
  valor,
  onCambiar,
  largo = 6,
  disabled,
  error,
  name,
  etiqueta = "PIN",
  className,
}: TecladoPinProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const poner = (d: string) => {
    if (!disabled && valor.length < largo) onCambiar(valor + d);
  };
  const borrar = () => {
    if (!disabled) onCambiar(valor.slice(0, -1));
  };
  const tecla = (e: KeyboardEvent<HTMLDivElement>) => {
    if (/^\d$/.test(e.key)) poner(e.key);
    else if (e.key === "Backspace") borrar();
    else return;
    e.preventDefault();
  };
  const base =
    "flex h-14 min-w-14 items-center justify-center rounded-lg border border-border-control bg-surface text-xl font-medium text-fg transition-colors duration-150 hover:bg-surface-raised active:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 motion-reduce:transition-none";
  return (
    <div
      ref={raiz}
      role="group"
      aria-label={etiqueta}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={tecla}
      className={cn("flex flex-col items-center gap-5 outline-none", className)}
    >
      <div role="img" aria-label={`${valor.length} de ${largo} dígitos`} className="flex gap-3">
        {Array.from({ length: largo }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full border-2",
              i < valor.length
                ? error
                  ? "border-danger bg-danger"
                  : "border-accent bg-accent"
                : error
                  ? "border-danger"
                  : "border-fg-muted",
            )}
          />
        ))}
      </div>
      <div className="grid w-full max-w-72 grid-cols-3 gap-3">
        {TECLAS.map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => poner(d)}
            className={base}
          >
            {d}
          </button>
        ))}
        <span aria-hidden />
        <button type="button" disabled={disabled} onClick={() => poner("0")} className={base}>
          0
        </button>
        <button
          type="button"
          disabled={disabled || valor.length === 0}
          onClick={borrar}
          aria-label="Borrar el último dígito"
          className={base}
        >
          <Delete aria-hidden className="size-6" />
        </button>
      </div>
      {name ? <input type="hidden" name={name} value={valor} /> : null}
    </div>
  );
}

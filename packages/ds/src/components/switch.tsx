"use client";

import { useId } from "react";

import { cn } from "../cn";

type SwitchProps = {
  activo: boolean;
  onCambiar: (activo: boolean) => void;
  etiqueta: string;
  /** Texto secundario bajo la etiqueta. */
  descripcion?: string;
  disabled?: boolean;
  className?: string;
};

/** Interruptor accesible (role=switch). Fila completa tocable de 44px; pista de 40×24 con acento. */
export function Switch({
  activo,
  onCambiar,
  etiqueta,
  descripcion,
  disabled,
  className,
}: SwitchProps) {
  const id = useId();
  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-4", className)}>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-base font-medium text-fg">{etiqueta}</span>
        {descripcion ? <span className="t-caption block">{descripcion}</span> : null}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={activo}
        disabled={disabled}
        onClick={() => onCambiar(!activo)}
        className="flex h-11 w-12 flex-none items-center justify-center disabled:opacity-45"
      >
        <span
          className={cn(
            "flex h-6 w-10 items-center rounded-full p-0.5 transition-colors duration-150",
            activo ? "bg-accent" : "bg-border-strong",
          )}
        >
          <span
            className={cn(
              "size-5 rounded-full bg-surface transition-transform duration-150 ease-ds",
              activo && "translate-x-4",
            )}
          />
        </span>
      </button>
    </div>
  );
}

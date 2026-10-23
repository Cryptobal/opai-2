"use client";

import { Switch as RadixSwitch } from "radix-ui";
import { useId } from "react";

import { cn } from "../cn";

type SwitchProps = {
  activo: boolean;
  onCambiar: (activo: boolean) => void;
  etiqueta: string;
  /** Texto secundario bajo la etiqueta. */
  descripcion?: string;
  disabled?: boolean;
  /** Sin etiqueta visible (celdas de tabla): la etiqueta queda como nombre accesible. */
  soloControl?: boolean;
  className?: string;
};

/** Interruptor sobre Radix (role=switch). Fila completa tocable de 44 px; pista de 40×24 con acento. */
export function Switch(props: SwitchProps) {
  const { activo, onCambiar, etiqueta, descripcion, disabled, soloControl, className } = props;
  const id = useId();
  const control = (
    <RadixSwitch.Root
      id={id}
      checked={activo}
      onCheckedChange={onCambiar}
      disabled={disabled}
      {...(soloControl ? { "aria-label": etiqueta } : {})}
      className={cn(
        "group flex h-11 w-12 flex-none items-center justify-center outline-none disabled:opacity-45",
        "focus-visible:[&>span]:outline-2 focus-visible:[&>span]:outline-offset-2 focus-visible:[&>span]:outline-focus",
      )}
    >
      <span className="flex h-6 w-10 items-center rounded-full bg-border-strong p-0.5 transition-colors duration-150 group-data-[state=checked]:bg-accent">
        <RadixSwitch.Thumb className="size-5 rounded-full bg-surface transition-transform duration-150 ease-ds data-[state=checked]:translate-x-4 motion-reduce:transition-none" />
      </span>
    </RadixSwitch.Root>
  );
  if (soloControl) return <div className={className}>{control}</div>;
  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-4", className)}>
      <label htmlFor={id} className={cn("min-w-0", disabled ? "opacity-45" : "cursor-pointer")}>
        <span className="block text-base font-medium text-fg">{etiqueta}</span>
        {descripcion ? <span className="t-caption block">{descripcion}</span> : null}
      </label>
      {control}
    </div>
  );
}

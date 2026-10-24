"use client";

import { Check } from "lucide-react";
import { Checkbox as RadixCheckbox } from "radix-ui";
import { useId } from "react";

import { cn } from "../cn";
import { area, fila } from "./seleccion-clases";

type CheckboxProps = {
  marcado: boolean;
  onCambiar: (marcado: boolean) => void;
  etiqueta: string;
  descripcion?: string;
  error?: string;
  disabled?: boolean;
  /** Sin etiqueta visible (celdas de tabla); la etiqueta queda como nombre accesible. */
  soloControl?: boolean;
  className?: string;
};

const caja = "ds-caja-20 rounded-[5px]";

/** Casilla de 20 px sobre Radix con fila tocable de 44 px, etiqueta y descripción. */
export function Checkbox(props: CheckboxProps) {
  const { marcado, onCambiar, etiqueta, descripcion, error, disabled, soloControl } = props;
  const id = useId();
  const control = (
    <RadixCheckbox.Root
      id={id}
      checked={marcado}
      onCheckedChange={(v) => onCambiar(v === true)}
      disabled={disabled}
      aria-invalid={error ? true : undefined}
      {...(soloControl ? { "aria-label": etiqueta } : {})}
      className={cn(area, soloControl ? "-m-3" : "-mx-3 -mt-2.5 -mb-3")}
    >
      <span className={caja}>
        <RadixCheckbox.Indicator>
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
        </RadixCheckbox.Indicator>
      </span>
    </RadixCheckbox.Root>
  );
  if (soloControl) return control;
  return (
    <div className={cn(fila, props.className)}>
      {control}
      <label htmlFor={id} className={cn("min-w-0", disabled ? "opacity-45" : "cursor-pointer")}>
        <span className="block text-md text-fg">{etiqueta}</span>
        {descripcion ? <span className="t-caption block">{descripcion}</span> : null}
        {error ? <span className="block text-xs font-medium text-danger-fg">{error}</span> : null}
      </label>
    </div>
  );
}

"use client";

import { Check } from "lucide-react";
import { Checkbox as RadixCheckbox, RadioGroup as RadixRadio } from "radix-ui";
import { useId } from "react";

import { cn } from "../cn";

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

// El control mide 44×44 (área tocable); el cuadro visible sigue de 20 px. Los márgenes negativos
// devuelven al diseño su ancho de 20 px, así que no cambia la composición de la fila.
const area = "group ds-area-44 disabled:opacity-45";
const caja = "ds-caja-20 rounded-[5px]";
const circulo = "ds-caja-20 rounded-full";
const fila = "flex min-h-11 items-start gap-3 py-2.5";

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

export type OpcionRadio = {
  valor: string;
  etiqueta: string;
  descripcion?: string;
  disabled?: boolean;
};

type RadioGroupProps = {
  valor: string | undefined;
  onCambiar: (valor: string) => void;
  opciones: readonly OpcionRadio[];
  etiqueta: string;
  /** `fila`: opciones en línea (md+). */
  orientacion?: "columna" | "fila";
  className?: string;
};

/** Selección única sobre Radix: círculo de 20 px, fila tocable de 44 px, etiqueta y descripción. */
export function RadioGroup(props: RadioGroupProps) {
  const { valor, onCambiar, opciones, etiqueta, orientacion = "columna" } = props;
  const base = useId();
  return (
    <RadixRadio.Root
      {...(valor !== undefined ? { value: valor } : {})}
      onValueChange={onCambiar}
      aria-label={etiqueta}
      className={cn(
        "flex",
        orientacion === "fila" ? "flex-col md:flex-row md:gap-6" : "flex-col",
        props.className,
      )}
    >
      {opciones.map((o) => (
        <div key={o.valor} className={fila}>
          <RadixRadio.Item
            id={`${base}-${o.valor}`}
            value={o.valor}
            {...(o.disabled ? { disabled: true } : {})}
            className={cn(area, "-mx-3 -mt-2.5 -mb-3")}
          >
            <span className={circulo}>
              <RadixRadio.Indicator className="size-2.5 rounded-full bg-accent" />
            </span>
          </RadixRadio.Item>
          <label
            htmlFor={`${base}-${o.valor}`}
            className={cn("min-w-0", o.disabled ? "opacity-45" : "cursor-pointer")}
          >
            <span className="block text-md text-fg">{o.etiqueta}</span>
            {o.descripcion ? <span className="t-caption block">{o.descripcion}</span> : null}
          </label>
        </div>
      ))}
    </RadixRadio.Root>
  );
}

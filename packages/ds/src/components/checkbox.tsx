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

const caja =
  "flex size-5 flex-none items-center justify-center rounded-[5px] border border-border-strong bg-surface outline-none transition-colors duration-150 data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-fg aria-invalid:border-danger-fg";
const fila = "flex min-h-11 items-start gap-3 py-2.5";
const foco =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-45";

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
      className={cn(caja, foco, !soloControl && "mt-0.5")}
    >
      <RadixCheckbox.Indicator>
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </RadixCheckbox.Indicator>
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
            className={cn(
              "mt-0.5 flex size-5 flex-none items-center justify-center rounded-full border border-border-strong bg-surface data-[state=checked]:border-accent",
              foco,
            )}
          >
            <RadixRadio.Indicator className="size-2.5 rounded-full bg-accent" />
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

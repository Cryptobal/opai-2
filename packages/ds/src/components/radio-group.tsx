"use client";

import { RadioGroup as RadixRadio } from "radix-ui";
import { useId } from "react";

import { cn } from "../cn";
import { area, fila } from "./seleccion-clases";

// Archivo propio para que Checkbox no arrastre RadioGroup ni RovingFocus al JS de sus rutas
// (ADR-037), y viceversa.
const circulo = "ds-caja-20 rounded-full";

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

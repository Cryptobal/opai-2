"use client";

import { Clock } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "../cn";
import { aplicarMascaraHora, horaValida } from "../lib/formato-entrada";
import { Input } from "./input";
import { Popover } from "./popover";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "min" | "max" | "name" | "required" | "form"
> & {
  /** Hora «HH:mm» (24 h) o vacío. */
  valor: string;
  onCambiar: (valor: string) => void;
  invalido?: boolean | undefined;
};

/** Reloj de 24 h: 00 a 23 (la medianoche de cierre es «00:00»; un turno que termina antes de empezar cruza el día). */
export const HORAS_SELECTOR = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
/** Cuartos de hora (CAR-192); otros minutos se siguen pudiendo escribir con la máscara. */
export const MINUTOS_SELECTOR = ["00", "15", "30", "45"] as const;
const HORAS = HORAS_SELECTOR;
const MINUTOS = MINUTOS_SELECTOR;
const OPCION =
  "h-9 min-w-11 rounded-md px-2 text-base text-fg outline-none transition-colors duration-150 hover:bg-fill focus-visible:shadow-[0_0_0_3px_var(--ds-accent-muted)]";

/**
 * Hora «HH:mm» en 24 h con selector propio del DS (no el nativo del sistema): se escribe con
 * máscara o se elige de la lista de horas y minutos (00, 15, 30 y 45). El valor es «HH:mm» válido o vacío.
 */
export function SelectorHora({ valor, onCambiar, invalido, className, ...props }: Props) {
  const [texto, setTexto] = useState(valor);
  const [abierto, setAbierto] = useState(false);
  const auto = useId();
  // Si el valor cambia desde fuera (reset) el texto lo sigue; un texto a medio escribir se respeta.
  useEffect(() => {
    setTexto((t) => (horaValida(t) === valor ? t : valor));
  }, [valor]);
  const [hh = "", mm = ""] = texto.split(":");
  const incompleto = texto.length === 5 && !horaValida(texto);
  const escribir = (crudo: string) => {
    const t = aplicarMascaraHora(crudo);
    setTexto(t);
    onCambiar(horaValida(t));
  };
  // Elegir la hora deja el selector abierto para los minutos; elegir los minutos lo cierra.
  const elegir = (h: string, m: string, cerrar: boolean) => {
    const t = `${h || "00"}:${m || "00"}`;
    setTexto(t);
    onCambiar(t);
    if (cerrar) setAbierto(false);
  };
  return (
    <span className={cn("relative block", className)}>
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="hh:mm"
        maxLength={5}
        value={texto}
        onChange={(e) => escribir(e.target.value)}
        aria-invalid={invalido || incompleto || undefined}
        className="pr-11"
        {...props}
        id={props.id ?? auto}
      />
      <Popover
        abierto={abierto}
        onCambiar={setAbierto}
        etiqueta="Elegir hora"
        alinear="end"
        className="w-auto p-2"
        disparador={
          <button
            type="button"
            aria-label="Abrir selector de hora"
            disabled={props.disabled}
            className="ds-btn-calendario"
          >
            <Clock aria-hidden className="size-4" />
          </button>
        }
      >
        <div className="flex gap-2">
          <ul aria-label="Horas" className="grid max-h-56 grid-cols-4 gap-1 overflow-y-auto">
            {HORAS.map((h) => (
              <li key={h}>
                <button
                  type="button"
                  aria-pressed={h === hh}
                  onClick={() => elegir(h, mm, false)}
                  className={cn(OPCION, h === hh && "bg-accent-muted font-medium")}
                >
                  {h}
                </button>
              </li>
            ))}
          </ul>
          <ul aria-label="Minutos" className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto border-l border-border pl-2">
            {MINUTOS.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  aria-pressed={m === mm}
                  onClick={() => elegir(hh, m, true)}
                  className={cn(OPCION, m === mm && "bg-accent-muted font-medium")}
                >
                  {m}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Popover>
    </span>
  );
}

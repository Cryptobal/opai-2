import { Calendar, Clock } from "lucide-react";
import { type InputHTMLAttributes, useEffect, useRef, useState } from "react";

import { cn } from "../cn";
import { aplicarMascara, isoAMascara, mascaraAIso } from "../lib/fecha";

/** `min`, `max`, `name`, `required` y `form` no aplican: el valor visible es dd-mm-aaaa, no ISO. */
type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "min" | "max" | "name" | "required" | "form"
> & {
  /** Fecha ISO `aaaa-mm-dd` o vacío. */
  valor: string;
  onCambiar: (valor: string) => void;
  invalido?: boolean | undefined;
  /** `time`: hora "HH:mm" con el selector del sistema. */
  tipo?: "date" | "time";
};

const CAMPO = cn(
  "h-11 w-full appearance-none rounded-md border border-border-strong bg-surface pr-11 pl-3 text-md text-fg outline-none transition-[border-color,box-shadow] duration-150",
  "focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--ds-accent-muted)] aria-invalid:border-danger-fg aria-invalid:shadow-[0_0_0_3px_var(--ds-danger-muted)] disabled:opacity-45",
);

/**
 * Fecha en es-CL independiente del idioma del sistema: se escribe y se ve como dd-mm-aaaa y el valor
 * es ISO. El icono abre el calendario nativo (útil en móvil). `tipo="time"` usa la hora del sistema.
 */
export function InputFecha({
  valor,
  onCambiar,
  invalido,
  tipo = "date",
  className,
  ...props
}: Props) {
  const Icono = tipo === "time" ? Clock : Calendar;
  if (tipo === "time") {
    return (
      <span className={cn("relative block", className)}>
        <input
          type="time"
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          aria-invalid={invalido || undefined}
          className={cn(
            CAMPO,
            "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
          )}
          {...props}
        />
        <Icono
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-muted"
        />
      </span>
    );
  }
  return (
    <CampoFecha
      valor={valor}
      onCambiar={onCambiar}
      invalido={invalido}
      className={className}
      {...props}
    />
  );
}

function CampoFecha({ valor, onCambiar, invalido, className, ...props }: Omit<Props, "tipo">) {
  const [texto, setTexto] = useState(isoAMascara(valor));
  const nativo = useRef<HTMLInputElement>(null);
  // Si el valor cambia desde fuera (reset, calendario) el texto lo sigue.
  useEffect(() => {
    setTexto((t) => (mascaraAIso(t) === valor ? t : isoAMascara(valor)));
  }, [valor]);
  const incompleto = texto.length === 10 && !mascaraAIso(texto);
  return (
    <span className={cn("relative block", className)}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        lang="es-CL"
        placeholder="dd-mm-aaaa"
        maxLength={10}
        value={texto}
        onChange={(e) => {
          const t = aplicarMascara(e.target.value);
          setTexto(t);
          onCambiar(mascaraAIso(t));
        }}
        aria-invalid={invalido || incompleto || undefined}
        className={CAMPO}
        {...props}
      />
      <input
        ref={nativo}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={valor}
        disabled={props.disabled}
        onChange={(e) => onCambiar(e.target.value)}
        className="pointer-events-none absolute right-0 bottom-0 size-px opacity-0"
      />
      <button
        type="button"
        aria-label="Abrir calendario"
        disabled={props.disabled}
        onClick={() => {
          try {
            nativo.current?.showPicker?.();
          } catch {
            /* sin permiso para abrir el calendario (iframe): se escribe a mano */
          }
        }}
        className="ds-btn-calendario"
      >
        <Calendar aria-hidden className="size-4" />
      </button>
    </span>
  );
}

/** Hora "HH:mm" (24 h) con el selector del sistema e icono de reloj. */
export function InputHora(props: Omit<Props, "tipo">) {
  return <InputFecha {...props} tipo="time" />;
}

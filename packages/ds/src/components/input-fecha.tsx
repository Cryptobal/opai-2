import { Calendar, Clock } from "lucide-react";
import type { InputHTMLAttributes } from "react";

import { cn } from "../cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  /** Fecha ISO `aaaa-mm-dd` o vacío. */
  valor: string;
  onCambiar: (valor: string) => void;
  invalido?: boolean;
  /** `time`: hora "HH:mm" con el selector del sistema. */
  tipo?: "date" | "time";
};

/**
 * Fecha sobre el selector nativo del sistema (iOS, Android y desktop), estilizado como `Input`, con
 * icono de calendario. El valor es ISO; el sistema lo muestra en el formato local (dd-mm-aaaa en es-CL).
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
  return (
    <span className={cn("relative block", className)}>
      <input
        type={tipo}
        lang="es-CL"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        aria-invalid={invalido || undefined}
        className={cn(
          "h-11 w-full appearance-none rounded-md border border-border-strong bg-surface pr-10 pl-3 text-md text-fg outline-none transition-[border-color,box-shadow] duration-150",
          "focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--ds-accent-muted)] aria-invalid:border-danger-fg aria-invalid:shadow-[0_0_0_3px_var(--ds-danger-muted)] disabled:opacity-45",
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

/** Hora "HH:mm" (24 h) con el selector del sistema e icono de reloj. */
export function InputHora(props: Omit<Props, "tipo">) {
  return <InputFecha {...props} tipo="time" />;
}

type RangoProps = {
  desde: string;
  hasta: string;
  onCambiar: (rango: { desde: string; hasta: string }) => void;
  etiquetaDesde?: string;
  etiquetaHasta?: string;
};

/** Rango desde–hasta; marca error si el término es anterior al inicio. */
export function InputFechaRango({ desde, hasta, onCambiar, ...e }: RangoProps) {
  const invalido = Boolean(desde && hasta && hasta < desde);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <InputFecha
          valor={desde}
          onCambiar={(v) => onCambiar({ desde: v, hasta })}
          aria-label={e.etiquetaDesde ?? "Desde"}
          className="flex-1"
        />
        <span aria-hidden className="text-fg-subtle">
          –
        </span>
        <InputFecha
          valor={hasta}
          onCambiar={(v) => onCambiar({ desde, hasta: v })}
          aria-label={e.etiquetaHasta ?? "Hasta"}
          invalido={invalido}
          className="flex-1"
        />
      </div>
      {invalido ? (
        <p className="text-xs font-medium text-danger-fg">El término es anterior al inicio</p>
      ) : null}
    </div>
  );
}

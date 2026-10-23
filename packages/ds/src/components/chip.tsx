import { X } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../cn";

type ChipProps = {
  etiqueta?: string;
  valor: string;
  onQuitar?: () => void;
  className?: string;
};

/** Chip de filtro activo: `Región: RM ×`. */
export function Chip({ etiqueta, valor, onQuitar, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border border-border-strong bg-surface pl-3 text-sm font-medium text-fg whitespace-nowrap",
        onQuitar ? "pr-1.5" : "pr-3",
        className,
      )}
    >
      {etiqueta ? <span className="font-normal text-fg-subtle">{etiqueta}:</span> : null}
      {valor}
      {onQuitar ? (
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar filtro ${etiqueta ?? valor}`}
          className="flex size-[22px] items-center justify-center rounded-full text-fg-muted hover:bg-fill"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}

/** Chip punteado para agregar un filtro. */
export function ChipAgregar({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-border-strong bg-surface px-3 text-sm font-medium text-fg-muted hover:bg-fill",
        className,
      )}
      {...props}
    >
      {children ?? "Filtro"}
    </button>
  );
}

/** Chip de filtro rápido que se activa y desactiva ("Vencidos 3"): relleno inverso cuando está activo. */
export function ChipToggle({
  etiqueta,
  contador,
  activo,
  onCambiar,
}: {
  etiqueta: string;
  contador?: number;
  activo: boolean;
  onCambiar: (activo: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={() => onCambiar(!activo)}
      className={cn(
        "inline-flex h-8 flex-none items-center gap-1.5 rounded-full border px-3 text-sm font-medium outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        activo
          ? "border-inverse-bg bg-inverse-bg text-inverse-fg"
          : "border-border-strong bg-surface text-fg hover:bg-fill",
      )}
    >
      {etiqueta}
      {contador !== undefined ? <span className="t-numeric opacity-75">{contador}</span> : null}
    </button>
  );
}

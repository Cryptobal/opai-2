"use client";

import { ChevronDown } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { cn } from "../cn";

export type OpcionSelect = { valor: string; etiqueta: string; descripcion?: string };

export type SelectProps = {
  id?: string;
  valor: string | undefined;
  onCambiar: (valor: string) => void;
  opciones: readonly OpcionSelect[];
  placeholder?: string;
  disabled?: boolean;
  /** Estado de error (borde y halo danger). */
  invalido?: boolean;
  "aria-label"?: string;
  name?: string;
  className?: string;
};

export const claseControl =
  "flex h-11 w-full items-center gap-2 rounded-md border border-border-control bg-surface px-3 text-md text-fg outline-none transition-[border-color,box-shadow] duration-150 hover:border-fg-subtle focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--ds-accent-muted)] disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-danger-fg aria-invalid:shadow-[0_0_0_3px_var(--ds-danger-muted)]";

const SelectRadix = lazy(() => import("./select-radix").then((m) => ({ default: m.SelectRadix })));

/** Disparador estático: mismo aspecto que el de Radix, sin cargar Radix (ADR-037). */
function Disparador(props: SelectProps & { onActivar?: () => void }) {
  const actual = props.opciones.find((o) => o.valor === props.valor);
  return (
    <button
      type="button"
      {...(props.id ? { id: props.id } : {})}
      aria-label={props["aria-label"]}
      aria-haspopup="listbox"
      aria-expanded={false}
      aria-invalid={props.invalido || undefined}
      disabled={props.disabled}
      onClick={props.onActivar}
      onKeyDown={(e) => (e.key === "ArrowDown" || e.key === "ArrowUp") && props.onActivar?.()}
      className={cn(claseControl, "justify-between text-left", props.className)}
    >
      <span className={cn("min-w-0 flex-1 truncate", !actual && "text-fg-subtle")}>
        {actual?.etiqueta ?? props.placeholder ?? "Elige una opción"}
      </span>
      <ChevronDown className="size-4 text-fg-muted" aria-hidden />
    </button>
  );
}

/**
 * Lista desplegable para 2–12 opciones sobre Radix (ADR-017), con carga diferida: la primitiva
 * se descarga al abrirla. Disparador de 44 px igual que `Input`; ítems de 44 px.
 */
export function Select(props: SelectProps) {
  const [activo, setActivo] = useState(false);
  if (!activo) return <Disparador {...props} onActivar={() => setActivo(true)} />;
  return (
    <Suspense fallback={<Disparador {...props} />}>
      <SelectRadix {...props} abiertoInicial />
    </Suspense>
  );
}

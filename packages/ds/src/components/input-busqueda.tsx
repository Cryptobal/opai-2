"use client";

import { Search, X } from "lucide-react";
import { type InputHTMLAttributes, useRef } from "react";

import { cn } from "../cn";
import { Kbd } from "./segmentado";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  valor: string;
  onCambiar: (valor: string) => void;
  /** Tecla que enfoca el campo desde cualquier lugar de la página ("/"). */
  atajo?: string;
};

/** Búsqueda: lupa a la izquierda, limpiar a la derecha y, en md+, la tecla de atajo. 44 px. */
export function InputBusqueda({ valor, onCambiar, atajo, className, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span className={cn("relative block", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
      />
      <input
        ref={ref}
        type="search"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && valor && onCambiar("")}
        className={cn(
          "h-11 w-full rounded-md border border-border-strong bg-surface pr-10 pl-9 text-md text-fg outline-none placeholder:text-fg-subtle",
          "transition-[border-color,box-shadow] duration-150 focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--ds-accent-muted)]",
          "[&::-webkit-search-cancel-button]:hidden",
        )}
        {...props}
        name={props.name ?? "buscar"}
      />
      {valor ? (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => {
            onCambiar("");
            ref.current?.focus();
          }}
          className="absolute top-0 right-0 flex size-11 items-center justify-center text-fg-muted hover:text-fg"
        >
          <X className="size-4" />
        </button>
      ) : atajo ? (
        <Kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 md:inline-flex">
          {atajo}
        </Kbd>
      ) : null}
    </span>
  );
}

"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { Button } from "./button";

type Props = {
  mensaje: ReactNode;
  /** Acción principal (p. ej. «Actualizar», «Instalar»). Opcional: en iOS el aviso es solo texto. */
  accion?: { etiqueta: string; onClick: () => void };
  onCerrar?: () => void;
  /** `flotante` (por defecto): fija sobre la barra inferior del teléfono. `false`: en línea (muestra /ds). */
  flotante?: boolean;
  className?: string;
};

/**
 * Banda de aviso no modal (PWA, ADR-044): versión nueva, instalar. No bloquea; se puede descartar,
 * respeta la safe-area y queda sobre la barra inferior del teléfono. Botones del DS, ≥ 44 px.
 */
export function Banda({ mensaje, accion, onCerrar, flotante = true, className }: Props) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3 shadow-overlay",
        flotante
          ? "fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 animate-[ds-aparecer_150ms_ease-out] motion-reduce:animate-none md:inset-x-auto md:right-4 md:bottom-4 md:w-[400px]"
          : "w-full",
        className,
      )}
    >
      <p className="min-w-0 flex-1 text-base text-fg">{mensaje}</p>
      {accion ? (
        <Button onClick={accion.onClick} className="flex-none">
          {accion.etiqueta}
        </Button>
      ) : null}
      {onCerrar ? (
        <Button
          size="icon"
          variant="ghost"
          aria-label="Descartar"
          onClick={onCerrar}
          className="flex-none"
        >
          <X className="size-5" />
        </Button>
      ) : null}
    </div>
  );
}

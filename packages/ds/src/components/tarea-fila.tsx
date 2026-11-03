"use client";

import { Clock, Flag } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { Avatar } from "./avatar";
import { Checkbox } from "./checkbox";

export type TonoVencimientoTarea = "danger" | "warning" | "neutro";

const COLOR: Record<TonoVencimientoTarea, string> = {
  danger: "text-danger-fg",
  warning: "text-warning-fg",
  neutro: "text-fg-muted",
};

type Props = {
  titulo: string;
  /** «Vencida hace 2 días», «Vence hoy 12:00». */
  vencimiento: string;
  tono: TonoVencimientoTarea;
  /** «Prioridad alta». */
  prioridad?: string | undefined;
  responsables: readonly string[];
  /** Ficha ligada como enlace (la arma quien usa el componente). */
  vinculo?: ReactNode;
  hecha: boolean;
  onMarcar?: ((hecha: boolean) => void) | undefined;
  /** Menú «Posponer» u otras acciones a la derecha. */
  acciones?: ReactNode;
  deshabilitada?: boolean;
  className?: string;
};

/**
 * Fila de tarea (CRM v3, CAR-162): casilla para marcar hecha, título, vencimiento con tono de aviso,
 * prioridad, responsables y la ficha ligada. Casilla y acciones con área tocable de 44 px.
 */
export function TareaFila(p: Props) {
  return (
    <div
      className={cn(
        "flex items-start gap-1 border-b border-border py-1 pr-2 pl-1 last:border-b-0",
        p.className,
      )}
    >
      <span className="flex size-11 flex-none items-center justify-center">
        <Checkbox
          soloControl
          etiqueta={p.hecha ? `Reabrir «${p.titulo}»` : `Marcar hecha «${p.titulo}»`}
          marcado={p.hecha}
          onCambiar={(v) => p.onMarcar?.(v)}
          disabled={p.deshabilitada || !p.onMarcar}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-2.5 pb-1">
        <span
          className={cn(
            "text-base font-medium",
            p.hecha ? "text-fg-subtle line-through" : "text-fg",
          )}
        >
          {p.titulo}
        </span>
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
          <span className={cn("inline-flex items-center gap-1.5 font-medium", COLOR[p.tono])}>
            <Clock className="size-3.5" aria-hidden />
            {p.vencimiento}
          </span>
          {p.prioridad ? (
            <span className="inline-flex items-center gap-1 text-fg-muted">
              <Flag className="size-3.5" aria-hidden />
              {p.prioridad}
            </span>
          ) : null}
          {p.vinculo ? <span className="min-w-0 truncate">{p.vinculo}</span> : null}
        </span>
      </div>
      <div className="flex flex-none items-center gap-0.5 pt-1">
        {p.responsables.slice(0, 3).map((r) => (
          <Avatar key={r} nombre={r} size="sm" />
        ))}
        {p.acciones}
      </div>
    </div>
  );
}

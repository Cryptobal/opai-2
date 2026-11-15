"use client";

import type { LucideIcon } from "lucide-react";

import { Button, cn } from "@opai/ds";

/** Acción del bloque «Documento y envío»: ícono, título y descripción corta (CAR-544). */
export function TarjetaAccionDocumento(p: {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  onClick: () => void;
  cargando?: boolean;
  activa?: boolean;
}) {
  const Icon = p.icono;
  return (
    <Button
      type="button"
      variant="secondary"
      {...(p.cargando ? { cargando: true } : {})}
      onClick={p.onClick}
      className={cn(
        "h-auto min-h-11 w-full items-start justify-start gap-3 whitespace-normal p-3 text-left font-normal",
        p.activa && "border-accent bg-fill/60",
      )}
    >
      <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-fill text-accent">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 space-y-0.5 text-left">
        <span className="t-label block">{p.titulo}</span>
        <span className="t-caption block text-fg-muted">{p.descripcion}</span>
      </span>
    </Button>
  );
}
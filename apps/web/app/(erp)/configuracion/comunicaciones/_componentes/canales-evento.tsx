"use client";

import { Inbox, Mail } from "lucide-react";

import { Button, cn } from "@opai/ds";

import { type Canal, NOMBRE_CANAL } from "./tipos";

const ICONO = { correo: Mail, inapp: Inbox } as const;

type Props = {
  canales: Canal[];
  transaccional: boolean;
  activo: (c: Canal) => boolean;
  pendiente: boolean;
  onCambiar: (c: Canal, activa: boolean) => void;
};

/** Canales de un evento (30). Los transaccionales no se pueden apagar: el canal es un ícono, no un botón. */
export function CanalesEvento({ canales, transaccional, activo, pendiente, onCambiar }: Props) {
  return (
    <span className="flex gap-1.5">
      {canales.map((c) => {
        const I = ICONO[c];
        if (transaccional)
          return (
            <span
              key={c}
              title={NOMBRE_CANAL[c]}
              className="grid size-9 place-items-center rounded-md border border-border-strong text-fg"
            >
              <I className="size-4" aria-label={NOMBRE_CANAL[c]} role="img" />
            </span>
          );
        const on = activo(c);
        return (
          <Button
            key={c}
            variant="ghost"
            size="icon"
            aria-label={`${NOMBRE_CANAL[c]}: ${on ? "activo" : "apagado"}`}
            aria-pressed={on}
            disabled={pendiente}
            onClick={() => onCambiar(c, !on)}
            className={cn(
              "rounded-md border",
              on ? "border-border-strong text-fg" : "border-dashed border-border text-fg-subtle",
            )}
          >
            <I className="size-4" />
          </Button>
        );
      })}
    </span>
  );
}

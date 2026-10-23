import { Bot } from "lucide-react";

import { Avatar } from "@opai/ds";

import { fecha, hora } from "@/lib/fechas";

import type { Evento } from "./datos";

export const cuando = (iso: string) => `${fecha(iso)} ${hora(iso)}`;
/** Las escrituras auditadas se completaron; los intentos (aprobación, presupuesto) traen su resultado. */
export const resultado = (e: Evento) => {
  const r = (e.extra as { resultado?: unknown } | null)?.resultado;
  return r ? `intento: ${String(r)}` : "completada";
};

export function Actor({ e }: { e: Evento }) {
  return (
    <span className="flex items-center gap-2.5">
      {e.actor.agente ? (
        <span
          aria-label="Agente"
          className="flex size-7 flex-none items-center justify-center rounded-md bg-accent-muted text-accent"
        >
          <Bot className="size-4" />
        </span>
      ) : (
        <Avatar nombre={e.actor.nombre} />
      )}
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{e.actor.nombre}</span>
        {e.via ? <span className="t-caption truncate">vía {e.via}</span> : null}
      </span>
    </span>
  );
}

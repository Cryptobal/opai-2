import { Bot, ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { iniciales } from "./avatar";
import { Badge } from "./badge";

export type ItemTimeline = {
  id: string;
  /** Persona o agente que hizo el cambio. */
  actor: { nombre: string; agente?: boolean };
  /** Frase de la acción, sin el actor ("cambió el estado a **Cliente activo**"). */
  accion: ReactNode;
  /** "hace 3 días · 20-10-2026 11:42". */
  cuando: string;
  /** Línea secundaria (vía, canal, enlace a auditoría). */
  meta?: ReactNode;
  /** Valor anterior → nuevo (historial de la ficha). */
  cambio?: { campo: string; antes?: string | null; despues?: string | null };
  /** Detalle plegable (payload, `t-mono`). */
  detalle?: ReactNode;
  /** Muestra la etiqueta Agente/Persona junto a la acción. */
  conTipo?: boolean;
};

function Marca({ actor }: { actor: ItemTimeline["actor"] }) {
  return actor.agente ? (
    <span className="z-10 flex size-6 flex-none items-center justify-center rounded-full border border-accent bg-accent-muted text-accent">
      <Bot className="size-3.5" aria-label="Agente" />
    </span>
  ) : (
    <span
      aria-hidden
      className="z-10 flex size-6 flex-none items-center justify-center rounded-full border border-border-strong bg-fill text-[9px] font-semibold text-fg-muted"
    >
      {iniciales(actor.nombre)}
    </span>
  );
}

/** Actividad de una entidad: punto y línea vertical fina; actor, acción, hace cuánto; detalle plegable. */
export function Timeline({
  items,
  className,
}: {
  items: readonly ItemTimeline[];
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {items.map((it, i) => (
        <li key={it.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i < items.length - 1 ? (
            <span aria-hidden className="absolute top-6 bottom-0 left-3 w-px bg-border-strong" />
          ) : null}
          <Marca actor={it.actor} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-base text-fg">
              <span className="font-semibold">{it.actor.nombre}</span> {it.accion}
              {it.conTipo ? (
                <Badge
                  tono={it.actor.agente ? "accent" : "neutro"}
                  punto={false}
                  className="ml-2 align-middle"
                >
                  {it.actor.agente ? "Agente" : "Persona"}
                </Badge>
              ) : null}
            </p>
            {it.cambio ? (
              <p className="flex flex-wrap items-center gap-2 text-base">
                <span className="text-fg-muted">{it.cambio.campo}</span>
                <span className="text-fg-subtle line-through">{it.cambio.antes ?? "—"}</span>
                <ChevronRight className="size-3.5 text-fg-subtle" aria-label="cambió a" />
                <span className="font-medium text-fg">{it.cambio.despues ?? "—"}</span>
              </p>
            ) : null}
            <p className="t-caption">
              {it.cuando}
              {it.meta ? <> · {it.meta}</> : null}
            </p>
            {it.detalle ? (
              <details className="group mt-1">
                <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-base font-medium text-fg-muted marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Ver detalle</span>
                  <span className="hidden group-open:inline">Ocultar detalle</span>
                  <ChevronDown
                    className="size-4 transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="t-mono mt-1 overflow-x-auto rounded-md bg-fill p-3 whitespace-pre text-fg">
                  {it.detalle}
                </div>
              </details>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

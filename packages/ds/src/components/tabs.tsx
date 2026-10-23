"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "../cn";

export type Tab = { id: string; etiqueta: string; contenido: ReactNode; contador?: number };

type TabsProps = { tabs: readonly Tab[]; inicial?: string; className?: string };

/** Pestañas accesibles (role=tablist) con scroll horizontal en teléfono. */
export function Tabs({ tabs, inicial, className }: TabsProps) {
  const [activa, setActiva] = useState(inicial ?? tabs[0]?.id ?? "");
  const base = useId();
  const actual = tabs.find((t) => t.id === activa) ?? tabs[0];
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map((tab) => {
          const seleccionada = tab.id === actual?.id;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`${base}-${tab.id}`}
              type="button"
              aria-selected={seleccionada}
              aria-controls={`${base}-panel-${tab.id}`}
              onClick={() => setActiva(tab.id)}
              className={cn(
                "min-h-11 shrink-0 border-b-2 px-3 text-base transition-colors",
                seleccionada ? "border-fg font-medium text-fg" : "border-transparent text-fg-muted hover:text-fg",
              )}
            >
              {tab.etiqueta}
              {tab.contador !== undefined ? <span className="ml-1.5 text-xs text-fg-subtle tabular-nums">{tab.contador}</span> : null}
            </button>
          );
        })}
      </div>
      {actual ? (
        <div role="tabpanel" id={`${base}-panel-${actual.id}`} aria-labelledby={`${base}-${actual.id}`}>
          {actual.contenido}
        </div>
      ) : null}
    </div>
  );
}

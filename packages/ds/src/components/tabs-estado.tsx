"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "../cn";
import { ContadorTab, estiloTab } from "./tab-estilo";

type TabEstado = { id: string; etiqueta: string; contenido?: ReactNode; contador?: number };

type Props = { tabs: readonly TabEstado[]; inicial?: string; className?: string };

/** Pestañas con estado local (contenido en memoria). La versión por ruta vive en `Tabs`. */
export function TabsEstado({ tabs, inicial, className }: Props) {
  const [activa, setActiva] = useState(inicial ?? tabs[0]?.id ?? "");
  const base = useId();
  const actual = tabs.find((t) => t.id === activa) ?? tabs[0];
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        role="tablist"
        className="-mx-4 flex gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 shadow-[inset_0_-1px_0_var(--ds-border)] md:mx-0 md:px-0"
      >
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
              className={estiloTab(seleccionada)}
            >
              {tab.etiqueta}
              <ContadorTab n={tab.contador} activa={seleccionada} />
            </button>
          );
        })}
      </div>
      {actual ? (
        <div
          role="tabpanel"
          id={`${base}-panel-${actual.id}`}
          aria-labelledby={`${base}-${actual.id}`}
        >
          {actual.contenido}
        </div>
      ) : null}
    </div>
  );
}

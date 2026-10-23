import type { ReactNode } from "react";

import { cn } from "../cn";
import { Tabs, type Tab } from "../components/tabs";
import { Cabecera, Estado, type EstadoPantalla, type TextosEstado } from "./estado";

export type DetailScreenProps = {
  state: EstadoPantalla;
  titulo: string;
  subtitulo?: string;
  /** Badge de estado de la entidad. */
  estado?: ReactNode;
  acciones?: ReactNode;
  tabs?: readonly Tab[];
  children?: ReactNode;
  textos?: TextosEstado;
};

/** Detalle: cabecera con título, estado y acciones; tabs; secciones. */
export function DetailScreen({ state, titulo, subtitulo, estado, acciones, tabs, children, textos }: DetailScreenProps) {
  return (
    <section>
      <Cabecera
        titulo={titulo}
        {...(subtitulo ? { subtitulo } : {})}
        acciones={
          <>
            {estado}
            {acciones}
          </>
        }
      />
      <Estado state={state} variante="detalle" {...(textos ? { textos } : {})}>
        {tabs && tabs.length > 0 ? <Tabs tabs={tabs} /> : children}
      </Estado>
    </section>
  );
}

export function Seccion({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-border bg-surface p-4", className)}>
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-fg-muted">{titulo}</h3>
      {children}
    </section>
  );
}

export type Par = { etiqueta: string; valor: ReactNode };

/** Pares etiqueta–valor: una columna en teléfono, dos en md+. */
export function Pares({ items }: { items: readonly Par[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
      {items.map((p) => (
        <div key={p.etiqueta} className="flex flex-col gap-0.5">
          <dt className="text-sm text-fg-muted">{p.etiqueta}</dt>
          <dd className="text-base text-fg">{p.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

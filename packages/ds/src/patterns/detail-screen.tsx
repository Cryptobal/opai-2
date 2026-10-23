import type { ReactNode } from "react";

import { cn } from "../cn";
import { Tabs, type Tab } from "../components/tabs";
import type { LinkComponent } from "../shell/types";
import { Cabecera, Estado, type EstadoPantalla, type TextosEstado } from "./estado";

export type DetailScreenProps = {
  state: EstadoPantalla;
  titulo: string;
  subtitulo?: ReactNode;
  /** Badge de estado (va sobre el título, con un texto corto opcional como "desde 01-03-2024"). */
  estado?: ReactNode;
  acciones?: ReactNode;
  /** Avatar o monograma a la izquierda del título (ficha de persona). */
  inicio?: ReactNode;
  tabs?: readonly Tab[];
  /** Modo por ruta: id de la pestaña activa y componente de enlace; `children` es la página hija. */
  tabActiva?: string;
  Link?: LinkComponent;
  children?: ReactNode;
  textos?: TextosEstado;
};

/** Detalle: estado y título, subtítulo, acciones; tabs; secciones de pares etiqueta–valor. */
export function DetailScreen({
  state,
  titulo,
  subtitulo,
  estado,
  acciones,
  inicio,
  tabs,
  tabActiva,
  Link,
  children,
  textos,
}: DetailScreenProps) {
  const cabecera = (
    <Cabecera
      titulo={titulo}
      tituloSiempre
      tituloDetalle
      {...(subtitulo ? { subtitulo } : {})}
      {...(estado ? { sobre: estado } : {})}
      {...(acciones ? { acciones } : {})}
    />
  );
  return (
    <section>
      {inicio ? (
        <div className="flex items-start gap-4">
          <div className="flex-none">{inicio}</div>
          <div className="min-w-0 flex-1">{cabecera}</div>
        </div>
      ) : (
        cabecera
      )}
      <Estado state={state} variante="detalle" {...(textos ? { textos } : {})}>
        {tabs && tabs.length > 0 ? (
          <Tabs
            tabs={tabs}
            {...(tabActiva ? { activa: tabActiva } : {})}
            {...(Link ? { Link } : {})}
          >
            {children}
          </Tabs>
        ) : (
          children
        )}
      </Estado>
    </section>
  );
}

export function Seccion({
  titulo,
  children,
  className,
}: {
  titulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      <h3 className="t-label mb-1 text-fg">{titulo}</h3>
      {children}
    </section>
  );
}

export type Par = { etiqueta: string; valor: ReactNode; numerico?: boolean };

/** Filas etiqueta–valor con divisor: etiqueta a la izquierda (muted), valor a la derecha. */
export function Pares({ items }: { items: readonly Par[] }) {
  return (
    <dl className="divide-y divide-border">
      {items.map((p) => (
        <div key={p.etiqueta} className="flex min-h-10 items-center justify-between gap-4 py-2">
          <dt className="shrink-0 text-base text-fg-muted">{p.etiqueta}</dt>
          <dd className={cn("min-w-0 text-right text-base text-fg", p.numerico && "t-numeric")}>
            {p.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

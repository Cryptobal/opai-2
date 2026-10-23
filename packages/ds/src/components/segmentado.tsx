import type { ReactNode } from "react";

import { cn } from "../cn";
import { type LinkComponent, LinkPorDefecto } from "../shell/types";

export type OpcionSegmentada = {
  id: string;
  etiqueta: string;
  href?: string;
  onClick?: () => void;
};

type Props = {
  opciones: readonly OpcionSegmentada[];
  activa: string;
  etiqueta: string;
  Link?: LinkComponent;
  /** `plano`: pestañas de la barra superior (Personas · Cargos y sueldos), sin riel. */
  variante?: "riel" | "plano";
  className?: string;
};

/** Control segmentado (Todo · Personas · Agentes): enlaces por ruta o botones; 36 px en un riel de 44. */
export function Segmentado({
  opciones,
  activa,
  etiqueta,
  Link = LinkPorDefecto,
  variante = "riel",
  className,
}: Props) {
  const plano = variante === "plano";
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className={cn(
        "inline-flex items-center gap-0.5",
        plano ? "h-11 gap-1" : "h-10 rounded-md bg-fill p-1",
        className,
      )}
    >
      {opciones.map((o) => {
        const on = o.id === activa;
        const clase = cn(
          "inline-flex h-8 items-center rounded-sm px-3 text-base font-medium whitespace-nowrap outline-none transition-colors focus-visible:outline-2 focus-visible:outline-focus",
          plano && "h-9 rounded-md px-4",
          plano && on
            ? "bg-fill text-fg"
            : on
            ? "bg-surface text-fg shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
            : "text-fg-muted hover:text-fg",
        );
        return o.href ? (
          <Link key={o.id} href={o.href} className={clase} aria-current={on ? "page" : undefined}>
            {o.etiqueta}
          </Link>
        ) : (
          <button key={o.id} type="button" onClick={o.onClick} aria-pressed={on} className={clase}>
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

/** Tecla (`⌘K`, `Esc`, `↵`). */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-bg px-1 text-xs font-medium text-fg-subtle",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Barra flotante de selección múltiple ("2 seleccionadas · Rechazar · Aprobar 2"): inversa. */
export function BarraSeleccion({
  texto,
  detalle,
  children,
}: {
  texto: string;
  detalle?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label="Selección"
      className="fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-lg bg-inverse-bg px-4 py-3 text-inverse-fg shadow-overlay md:sticky md:inset-x-auto md:bottom-4"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{texto}</p>
        {detalle ? <p className="truncate text-xs opacity-75">{detalle}</p> : null}
      </div>
      <div className="flex flex-none items-center gap-2">{children}</div>
    </div>
  );
}

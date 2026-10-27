"use client";

import { Pin, type LucideIcon } from "lucide-react";

import { cn } from "../cn";
import { BotonFijar } from "./boton-fijar";
import { esActivo, LinkPorDefecto, type LinkComponent } from "./types";

export type ItemFijado = { href: string; etiqueta: string; icono?: LucideIcon };

type Props = {
  items: readonly ItemFijado[];
  rutaActual: string;
  onDesfijar: (href: string) => void;
  Link?: LinkComponent;
  error?: boolean;
  reintentar?: () => void;
  onNavegar?: (href: string) => void;
};

/**
 * Fijados (D3, §8.2.3): hasta cinco, arriba de la barra lateral, sin contador. Sin fijados, una
 * línea de ayuda discreta en vez de una sección vacía (pantalla 07-a del export).
 */
export function Fijados({ items, rutaActual, onDesfijar, Link = LinkPorDefecto, error, reintentar, onNavegar }: Props) {
  return (
    <div className="flex flex-col gap-px px-3 pt-2">
      <p className="t-overline px-2 pb-1.5">Fijados</p>
      {error ? (
        <div role="alert" className="t-caption px-2 pb-2">No pudimos cargar tus fijados. <button type="button" onClick={reintentar} className="underline">Reintentar</button></div>
      ) : items.length === 0 ? (
        <p className="t-caption px-2 pb-2">
          Fija hasta cinco entradas o fichas para tenerlas a mano.
        </p>
      ) : (
        items.map((item) => {
          const activo = esActivo(rutaActual, item.href);
          const Icono = item.icono ?? Pin;
          return (
            <div
              key={item.href}
              className={cn(
                "group flex h-[35px] items-center gap-2.5 rounded-md pr-1 pl-2 text-base font-medium",
                activo ? "bg-fill text-fg" : "text-fg-muted hover:bg-fill hover:text-fg",
              )}
            >
              <Link
                href={item.href}
                {...(onNavegar ? { onClick: (e: React.MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); onNavegar(item.href); } } : {})}
                aria-current={activo ? "page" : undefined}
                className="flex min-w-0 flex-1 items-center gap-2.5 outline-none focus-visible:outline-2 focus-visible:outline-focus"
              >
                <Icono className={cn("size-4 flex-none", activo && "text-accent")} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{item.etiqueta}</span>
              </Link>
              <BotonFijar fijado onFijar={() => onDesfijar(item.href)} />
            </div>
          );
        })
      )}
    </div>
  );
}

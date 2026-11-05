"use client";

import { Pin } from "lucide-react";

import { cn } from "../cn";
import { clicSimple } from "./acceso-rapido";
import type { NavItem } from "./types";

type Props = {
  item: Pick<NavItem, "href" | "etiqueta" | "icono">;
  /** Es la página actual: marca de acento y `aria-current="page"`. */
  activo?: boolean;
  /** Fila de nivel superior (entrada suelta o única de su área): sin la sangría de las áreas. */
  raiz?: boolean;
  /** Está fijada: lleva un pin pequeño (diseño «fijados marcados con pin»). */
  fijada?: boolean;
  onNavegar: (href: string) => void;
};

/**
 * Entrada del menú «Más» (CAR-182, lámina 20): fila de 48 px con ícono de 20 px sin ficha y el nombre
 * completo; si no cabe en una línea pasa a dos, nunca se corta ni desborda.
 */
export function EntradaMas({ item, activo, raiz, fijada, onNavegar }: Props) {
  return (
    <a
      href={item.href}
      aria-current={activo ? "page" : undefined}
      onClick={(e) => clicSimple(e, () => onNavegar(item.href))}
      className={cn(
        "relative flex min-h-12 min-w-0 items-center gap-3 rounded-md py-1 pr-3 t-body text-fg outline-none transition-colors duration-150 hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus active:bg-fill motion-reduce:transition-none",
        raiz ? "pl-2" : "pl-10",
        activo &&
          "bg-accent-muted font-medium text-accent before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-sm before:bg-accent",
      )}
    >
      <item.icono className={cn("size-5 flex-none", activo ? "text-accent" : "text-fg-muted")} aria-hidden />
      <span className="line-clamp-2 min-w-0 flex-1 text-balance">{item.etiqueta}</span>
      {fijada ? <Pin className="size-3.5 flex-none text-fg-subtle" aria-label="Fijado" /> : null}
    </a>
  );
}

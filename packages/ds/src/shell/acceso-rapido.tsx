"use client";

import { Clock, Pin, PinOff } from "lucide-react";
import type { MouseEvent } from "react";

import { cn } from "../cn";
import type { ItemFijado } from "./fijados";

/** Clic normal navega sin recargar; con Ctrl, ⌘ o la rueda deja actuar al enlace del navegador. */
export function clicSimple(e: MouseEvent, hacer: () => void) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  hacer();
}

const base =
  "relative flex min-h-11 min-w-0 max-w-[176px] flex-none items-center gap-2 rounded-md border border-border bg-surface px-3 t-label text-fg outline-none transition-[background-color,transform] duration-150 hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] active:bg-fill motion-reduce:transition-none motion-reduce:active:scale-100";

type Props = {
  item: ItemFijado;
  /** Es la página actual. */
  activo?: boolean;
  /** Está fijado: lleva un pin pequeño. */
  fijado?: boolean;
  onNavegar: (href: string) => void;
  /** En edición: botón de 44 px para fijar o desfijar. Sin acción, el acceso queda como en reposo. */
  edicion?: { accion: "fijar" | "desfijar"; onAccion: () => void };
};

/**
 * Acceso rápido (CAR-182, lámina 20): ficha compacta de 44 px con ícono de 20 px y el nombre en una
 * línea con puntos suspensivos (el nombre completo va en `title`). Estados: reposo, hover, foco,
 * presionado, activo (borde y fondo de acento), fijado (pin) y en edición (botón de 44 px).
 */
export function AccesoRapido({ item, activo, fijado, onNavegar, edicion }: Props) {
  const Icono = item.icono ?? Clock;
  const contenido = (
    <>
      <Icono className={cn("size-5 flex-none", activo ? "text-accent" : "text-fg-muted")} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.etiqueta}</span>
      {fijado ? <Pin className="size-3 flex-none text-fg-subtle" aria-label="Fijado" /> : null}
    </>
  );
  const estado = activo ? "border-accent bg-accent-muted text-accent" : "";
  if (edicion) {
    const Accion = edicion.accion === "desfijar" ? PinOff : Pin;
    return (
      <span className={cn(base, "pr-0 hover:bg-surface active:scale-100", estado)} title={item.etiqueta}>
        {contenido}
        <button
          type="button"
          aria-label={`${edicion.accion === "desfijar" ? "Desfijar" : "Fijar"} ${item.etiqueta}`}
          onClick={edicion.onAccion}
          className="-my-px flex size-11 flex-none items-center justify-center rounded-r-md border-l border-border text-fg outline-none hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          <Accion className="size-4" aria-hidden />
        </button>
      </span>
    );
  }
  return (
    <a
      href={item.href}
      title={item.etiqueta}
      aria-current={activo ? "page" : undefined}
      onClick={(e) => clicSimple(e, () => onNavegar(item.href))}
      className={cn(base, estado)}
    >
      {contenido}
    </a>
  );
}

"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "../cn";

export type ItemMenu = {
  id: string;
  etiqueta: string;
  icono?: LucideIcon;
  /** Marca de selección (empresa actual). */
  marcado?: boolean;
  peligro?: boolean;
  /** Encabezado de grupo encima de este ítem. */
  grupo?: string;
  onSelect: () => void;
};

type MenuProps = {
  /** Contenido del botón disparador (avatar, icono…). */
  disparador: ReactNode;
  etiqueta: string;
  items: readonly ItemMenu[];
  /** Cabecera informativa (nombre y correo del usuario). */
  cabecera?: ReactNode;
  /** Dónde se abre respecto del disparador. */
  lado?: "abajo-derecha" | "arriba-izquierda";
  className?: string;
  claseDisparador?: string;
};

/** Menú desplegable accesible (role=menu): Escape y clic fuera cierran; ítems de 44px. */
export function Menu(props: MenuProps) {
  const {
    disparador,
    etiqueta,
    items,
    cabecera,
    lado = "abajo-derecha",
    className,
    claseDisparador,
  } = props;
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) =>
      !ref.current?.contains(e.target as Node) && setAbierto(false);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
        className={cn(
          "flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-fill",
          claseDisparador,
        )}
      >
        {disparador}
      </button>
      {abierto ? (
        <div
          role="menu"
          aria-label={etiqueta}
          className={cn(
            "absolute z-30 w-64 rounded-lg border border-border bg-surface-raised py-1 shadow-overlay",
            lado === "abajo-derecha" ? "top-full right-0 mt-1" : "bottom-full left-0 mb-1",
          )}
        >
          {cabecera ? <div className="border-b border-border px-3 py-2.5">{cabecera}</div> : null}
          {items.map((item) => (
            <div key={item.id}>
              {item.grupo ? <p className="t-overline px-3 pt-3 pb-1">{item.grupo}</p> : null}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAbierto(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex h-11 w-full items-center gap-2.5 px-3 text-left text-base hover:bg-fill",
                  item.peligro ? "text-danger-fg" : "text-fg",
                )}
              >
                {item.icono ? <item.icono className="size-4 text-fg-muted" aria-hidden /> : null}
                <span className="min-w-0 flex-1 truncate">{item.etiqueta}</span>
                {item.marcado ? <Check className="size-4 text-accent" aria-label="actual" /> : null}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

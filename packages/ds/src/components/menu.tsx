"use client";

import type { LucideIcon } from "lucide-react";
import { lazy, type ReactNode, Suspense, useState } from "react";

import { cn } from "../cn";
import type { MenuProps } from "./menu-radix";

export type ItemMenu = {
  id: string;
  etiqueta: string;
  descripcion?: string;
  separador?: boolean;
  icono?: LucideIcon;
  /** Marca de selección (empresa o portal actual). */
  marcado?: boolean;
  peligro?: boolean;
  deshabilitado?: boolean;
  /** Encabezado de grupo encima de este ítem. */
  grupo?: string;
  /** Punto de aviso en el ícono (p. ej. novedades sin leer). */
  punto?: boolean;
  /** Número de pendientes en una píldora roja a la derecha (p. ej. novedades sin leer, CAR-316). */
  contador?: number;
  onSelect: () => void;
};

export const LADO = {
  "abajo-derecha": { side: "bottom", align: "end" },
  "abajo-izquierda": { side: "bottom", align: "start" },
  "arriba-izquierda": { side: "top", align: "start" },
  "arriba-derecha": { side: "top", align: "end" },
  /** Junto al riel de iPad: se abre hacia la derecha, alineado con el disparador. */
  derecha: { side: "right", align: "start" },
} as const;

export const claseOverlay =
  "z-50 rounded-md border border-border bg-surface-raised text-fg shadow-overlay outline-none data-[state=open]:animate-[ds-entrar_150ms_var(--ds-ease)] motion-reduce:animate-none";

export const claseDisparadorMenu =
  "flex min-h-11 min-w-11 items-center justify-center rounded-md outline-none hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[state=open]:bg-fill";

const MenuRadix = lazy(() => import("./menu-radix").then((m) => ({ default: m.MenuRadix })));

function Disparador(props: MenuProps & { onActivar?: () => void }) {
  return (
    <div className={cn("relative", props.className)}>
      <button
        type="button"
        aria-label={props.etiqueta}
        {...(props.titulo ? { title: props.titulo } : {})}
        aria-haspopup="menu"
        aria-expanded={false}
        onClick={props.onActivar}
        onKeyDown={(e) =>
          (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && props.onActivar?.()
        }
        className={cn(claseDisparadorMenu, props.claseDisparador)}
      >
        {props.disparador as ReactNode}
      </button>
    </div>
  );
}

/**
 * Menú desplegable (Radix, ADR-017) con carga diferida: hasta el primer clic solo existe el
 * disparador, así Radix no pesa en el JS inicial de cada ruta (ADR-037).
 */
export function Menu(props: MenuProps) {
  const [activo, setActivo] = useState(false);
  if (!activo) return <Disparador {...props} onActivar={() => setActivo(true)} />;
  return (
    <Suspense fallback={<Disparador {...props} />}>
      <MenuRadix {...props} abiertoInicial />
    </Suspense>
  );
}

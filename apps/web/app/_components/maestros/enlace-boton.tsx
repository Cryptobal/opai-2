import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn, estilosBoton } from "@opai/ds";

export type PropsEnlaceBoton = {
  href: string;
  children: ReactNode;
  variante?: "primary" | "secondary" | "ghost";
  icono?: LucideIcon;
  /** Solo icono (con nombre accesible). */
  etiqueta?: string;
  className?: string;
};

/** Enlace con aspecto de botón: acciones que abren una ruta (`?nueva=1`, `/instalaciones/nueva`). */
export function EnlaceBoton({
  href,
  children,
  variante = "primary",
  icono: Icono,
  etiqueta,
  className,
}: PropsEnlaceBoton) {
  return (
    <Link
      href={href}
      aria-label={etiqueta}
      className={cn(estilosBoton({ variant: variante }), className)}
    >
      {Icono ? <Icono className="size-4" aria-hidden /> : null}
      {children}
    </Link>
  );
}

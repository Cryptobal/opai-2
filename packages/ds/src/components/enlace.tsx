import type { ReactNode } from "react";

import { cn } from "../cn";
import { type LinkComponent, LinkPorDefecto } from "../shell/types";

type Props = {
  href: string;
  children: ReactNode;
  Link?: LinkComponent;
  /** `accion`: color de acento («Editar plantilla», «Conectar tu IA»). `fila`: texto de tabla o lista. */
  variante?: "accion" | "fila";
  className?: string;
};

/** Clases del enlace de texto con caja tocable de 44 px (para el `Link` propio de cada app). */
export const claseEnlace = (variante: "accion" | "fila" = "accion") =>
  cn(
    "inline-flex min-h-11 items-center rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-focus",
    "underline-offset-2 hover:underline",
    variante === "accion" ? "text-accent" : "text-fg",
  );

/** Enlace de texto del DS: la caja mide 44 px de alto aunque el texto sea de una línea. */
export function Enlace({ href, children, Link = LinkPorDefecto, variante, className }: Props) {
  return (
    <Link href={href} className={cn(claseEnlace(variante), className)}>
      {children}
    </Link>
  );
}

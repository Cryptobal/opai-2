import type { ReactNode } from "react";

import { cn } from "@opai/ds";

/** Envoltorio con resalte lista↔mapa (hover y selección). */
export function CeldaPuntoResaltable({
  id,
  seleccionadoId,
  onHover,
  onFoco,
  className,
  children,
}: {
  id: string;
  seleccionadoId?: string | null | undefined;
  onHover?: ((id: string | null) => void) | undefined;
  onFoco?: ((id: string) => void) | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <span
      data-punto-id={id}
      className={cn(
        className,
        seleccionadoId === id && "rounded-md ring-2 ring-accent ring-offset-2 ring-offset-surface",
      )}
      onMouseEnter={() => onHover?.(id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onFoco?.(id)}
    >
      {children}
    </span>
  );
}
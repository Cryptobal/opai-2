"use client";

import { Button } from "@opai/ds";

type Props = { size?: "md" | "lg"; block?: boolean; variant?: "secondary" | "ghost" };

/** Recarga la página: recuperación de un tope temporal o una verificación caída. ≥44 px (size md/lg). */
export function BotonReintentar({ size = "lg", block, variant = "secondary" }: Props) {
  return (
    <Button variant={variant} size={size} block={block} onClick={() => window.location.reload()}>
      Reintentar
    </Button>
  );
}

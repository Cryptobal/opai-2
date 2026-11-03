import type { ReactNode } from "react";

import { cn } from "@opai/ds";

/** Acción principal fija abajo a la derecha en teléfono (D-B, Brief Personas y Cargos). */
export function AccionListaFlotante({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed right-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 lg:hidden",
        className,
      )}
    >
      <div className="pointer-events-auto shadow-overlay [&>*]:h-12 [&>*]:min-w-12 [&>*]:rounded-full [&>*]:px-4">
        {children}
      </div>
    </div>
  );
}

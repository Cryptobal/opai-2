import { ArrowDown, ArrowUp, CornerDownLeft } from "lucide-react";

import { cn } from "../cn";
import { Kbd } from "./segmentado";

/** Pie de la paleta con los atajos (solo con teclado: md+). */
export function PieTeclas() {
  return (
    <div
      className={cn(
        "hidden flex-none items-center gap-4 border-t border-border px-4 py-2.5 text-sm text-fg-muted md:flex",
      )}
    >
      <span className="flex items-center gap-1.5">
        <Kbd>
          <ArrowUp className="size-3" />
        </Kbd>
        <Kbd>
          <ArrowDown className="size-3" />
        </Kbd>{" "}
        Navegar
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>
          <CornerDownLeft className="size-3" />
        </Kbd>{" "}
        Abrir
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>Esc</Kbd> Cerrar
      </span>
    </div>
  );
}

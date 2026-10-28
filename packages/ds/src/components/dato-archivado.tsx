import type { ReactNode } from "react";
import { Archive } from "lucide-react";
import { Badge } from "./badge";

/** Dato histórico retirado: plegado inicialmente, sin acciones de modificación (07b §9). */
export function DatoArchivado({
  titulo,
  periodo,
  children,
}: {
  titulo: string;
  periodo?: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-lg border border-border bg-surface">
      <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-2 rounded-lg p-3 t-label focus-visible:outline-2 focus-visible:outline-accent">
        <Archive aria-hidden className="size-4 text-fg-muted" />
        {titulo}
        <Badge punto={false}>Archivada · ya no se usa para pagar</Badge>
      </summary>
      <div className="flex flex-col gap-3 border-t border-border p-4">
        {periodo ? <p className="t-caption">{periodo}</p> : null}
        {children}
        <p className="t-caption">Solo lectura · sin edición ni borrado</p>
      </div>
    </details>
  );
}

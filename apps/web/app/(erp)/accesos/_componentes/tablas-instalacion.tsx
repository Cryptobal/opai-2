import { Badge } from "@opai/ds";

/** Tarjeta de teléfono de las tablas de la pestaña Accesos de la instalación. */
export function Tarjeta({ titulo, sub, fin }: { titulo: string; sub: string; fin: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-base font-medium text-fg">{titulo}</span>
        <Badge>{fin}</Badge>
      </span>
      <span className="t-caption">{sub}</span>
    </span>
  );
}

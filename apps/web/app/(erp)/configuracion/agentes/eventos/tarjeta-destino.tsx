import { Badge } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import type { Destino } from "./datos";

/** Cuántos eventos se muestran por nombre antes de resumir el resto. */
const VISIBLES = 3;

export const estadoDestino = (d: Pick<Destino, "activo">) =>
  d.activo ? <Badge tono="success">Activo</Badge> : <Badge>Pausado</Badge>;

/** Fila de un destino de eventos: dirección, descripción, eventos suscritos y estado (CAR-352). */
export function TarjetaDestino({ d }: { d: Destino }) {
  const resto = d.eventos.length - VISIBLES;
  return (
    <li className="relative flex flex-col gap-2 border-b border-border p-4 last:border-b-0 md:flex-row md:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <LinkNext
          href={`/configuracion/agentes/eventos/${d.id}`}
          className="t-mono truncate text-base font-semibold text-fg after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-focus"
        >
          {d.url}
        </LinkNext>
        {d.descripcion ? <span className="text-sm text-fg-muted">{d.descripcion}</span> : null}
        <span className="flex flex-wrap gap-1.5">
          {d.eventos.slice(0, VISIBLES).map((e) => (
            <Badge key={e} punto={false}>
              {e}
            </Badge>
          ))}
          {resto > 0 ? <Badge punto={false}>+{resto} más</Badge> : null}
        </span>
      </div>
      <div className="flex items-center gap-2 md:flex-col md:items-end">
        {estadoDestino(d)}
        <span className="t-caption">
          Secreto <span className="t-mono">…{d.secretoSufijo}</span>
        </span>
      </div>
    </li>
  );
}

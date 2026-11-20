import { Badge, cn } from "@opai/ds";

import { MODO_PUNTO, puntoConGps } from "./etiquetas";
import { CeldaPuntoResaltable } from "./lista-puntos-resalte";
import { formatoMetricaPunto } from "./lista-puntos-util";
import type { Punto } from "./tipos";

export function TarjetaPuntoLista({
  p,
  seleccionadoId,
  onHover,
  onFoco,
}: {
  p: Punto;
  seleccionadoId?: string | null | undefined;
  onHover?: ((id: string | null) => void) | undefined;
  onFoco?: ((id: string) => void) | undefined;
}) {
  const inactivo = p.estado !== "activo";
  return (
    <CeldaPuntoResaltable
      id={p.id}
      seleccionadoId={seleccionadoId}
      onHover={onHover}
      onFoco={onFoco}
      className="flex w-full gap-2"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-base font-medium", inactivo && "text-fg-muted")}>
          {p.nombre}
        </span>
        <span className="t-caption truncate">
          {MODO_PUNTO[p.modo]} · radio {formatoMetricaPunto(p.radioM, "m")} ·{" "}
          {formatoMetricaPunto(p.permanenciaS, "s")}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {!puntoConGps(p.modo) ? (
          <Badge tono="neutro" className="text-[10px]">
            Sin GPS
          </Badge>
        ) : null}
        <Badge tono={inactivo ? "neutro" : "success"}>{inactivo ? "Archivado" : "Activo"}</Badge>
      </span>
    </CeldaPuntoResaltable>
  );
}
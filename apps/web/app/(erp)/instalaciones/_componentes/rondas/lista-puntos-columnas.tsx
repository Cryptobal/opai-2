import { Badge, cn } from "@opai/ds";

import { MODO_PUNTO, puntoConGps } from "./etiquetas";
import { CeldaPuntoResaltable } from "./lista-puntos-resalte";
import { formatoMetricaPunto } from "./lista-puntos-util";
import type { Punto } from "./tipos";

export function columnasPuntos(opts: {
  seleccionadoId?: string | null | undefined;
  onHover?: ((id: string | null) => void) | undefined;
}) {
  const { seleccionadoId, onHover } = opts;
  return [
    {
      id: "nombre",
      etiqueta: "Punto",
      className: "min-w-24 font-medium whitespace-normal wrap-break-word",
      render: (p: Punto) => (
        <CeldaPuntoResaltable
          id={p.id}
          seleccionadoId={seleccionadoId}
          onHover={onHover}
          className={cn("flex flex-col", p.estado !== "activo" && "text-fg-muted")}
        >
          <span>{p.nombre}</span>
          {p.exigeFoto ? <span className="t-caption">Pide foto</span> : null}
          {!puntoConGps(p.modo) ? <span className="t-caption text-fg-muted">Sin GPS</span> : null}
        </CeldaPuntoResaltable>
      ),
    },
    { id: "modo", etiqueta: "Modo", render: (p: Punto) => MODO_PUNTO[p.modo] },
    { id: "radio", etiqueta: "Radio", className: "t-numeric", render: (p: Punto) => formatoMetricaPunto(p.radioM, "m") },
    {
      id: "precision",
      etiqueta: "Precisión mín.",
      className: "hidden t-numeric lg:table-cell",
      render: (p: Punto) => formatoMetricaPunto(p.precisionMinM, "m"),
    },
    {
      id: "permanencia",
      etiqueta: "Permanencia",
      className: "hidden t-numeric lg:table-cell",
      render: (p: Punto) => formatoMetricaPunto(p.permanenciaS, "s"),
    },
    {
      id: "estado",
      etiqueta: "Estado",
      render: (p: Punto) => (
        <Badge tono={p.estado !== "activo" ? "neutro" : "success"}>
          {p.estado !== "activo" ? "Archivado" : "Activo"}
        </Badge>
      ),
    },
  ];
}
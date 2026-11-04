import { Badge } from "@opai/ds";

import type { Centro, Compra } from "../../_componentes/tipos";

export function CentroCelda({ c, centros }: { c: Compra; centros: Centro[] }) {
  if (c.centroCostoNombre) return <span>{c.centroCostoNombre}</span>;
  const sugerido = c.sugerencia
    ? centros.find((x) => x.id === c.sugerencia?.centroCostoId)?.nombre
    : undefined;
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge tono="warning">Sin centro de costo</Badge>
      {sugerido ? (
        <span className="text-xs text-fg-muted">
          Sugerido: {sugerido} ({c.sugerencia?.origen === "proveedor" ? "proveedor" : "última compra"})
        </span>
      ) : null}
    </span>
  );
}

export function Plazo({ c }: { c: Compra }) {
  if (c.estadoRecepcion !== "pendiente_revision") return <span>{c.estadoRecepcion}</span>;
  if (c.diasParaReclamo < 0) return <Badge tono="danger">Plazo vencido</Badge>;
  return (
    <Badge tono={c.diasParaReclamo <= 2 ? "warning" : "neutro"}>
      {c.diasParaReclamo === 0 ? "Vence hoy" : `${c.diasParaReclamo} d`}
    </Badge>
  );
}

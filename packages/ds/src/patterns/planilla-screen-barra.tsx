"use client";

import { cn } from "../cn";
import { TONO, type SeleccionPlanilla } from "./planilla-screen-types";

type Props = {
  seleccion: SeleccionPlanilla;
  onCerrar: () => void;
};

export function PlanillaBarraSeleccion({ seleccion, onCerrar }: Props) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-base">
      <div>
        <span className="font-medium text-fg">{seleccion.fila.etiqueta}</span>
        <span className="text-fg-muted"> · {seleccion.columna.etiqueta} · </span>
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 text-sm tabular-nums whitespace-nowrap",
            TONO[seleccion.celda.tono ?? "neutro"],
          )}
        >
          {seleccion.celda.texto}
        </span>
        {seleccion.celda.detalle ? (
          <span className="text-fg-muted"> · {seleccion.celda.detalle}</span>
        ) : null}
      </div>
      <button type="button" className="min-h-11 px-2 text-sm text-fg-muted" onClick={onCerrar}>
        Cerrar
      </button>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Button, Pares } from "@opai/ds";

import { pesos } from "@/lib/fechas";
import { etiquetaCategoria } from "@/lib/cpq-presentacion";

import type { PuestoOpcion } from "./costos-categoria-fila";

const EditorCostosCategoria = dynamic(
  () => import("./costos-categoria-editor").then((m) => m.EditorCostosCategoria),
  { ssr: false, loading: () => null },
);

const ORDEN_CATEGORIAS = ["mano_obra", "feriados", "uniformes", "examenes", "colacion", "movilizacion", "equipamiento", "vehiculos"];

/** Edición de costos por categoría (CAR-162); solo en borrador y con permiso de costos. */
export type CostosEditables = { versionId: string; puestos: PuestoOpcion[]; onGuardado: () => void };

/** Panel «Costos por categoría» del resumen: importes por categoría y, si se puede, «Editar costos». */
export function PanelCostosCategoria({
  categorias,
  costoPendiente,
  costos,
}: {
  categorias?: { id: string; costoMensual: number }[] | undefined;
  costoPendiente: boolean;
  costos?: CostosEditables;
}) {
  // Sin cálculo, una sola fila: no ocho «Pendiente» ni ceros. Una categoría fuera del orden fijo
  // (p. ej. «otros» con un costo manual) aparece cuando tiene monto.
  const ids = [...ORDEN_CATEGORIAS, ...(categorias ?? []).filter((c) => !ORDEN_CATEGORIAS.includes(c.id) && c.costoMensual > 0).map((c) => c.id)];
  const filas = costoPendiente
    ? [{ etiqueta: "Costos pendientes", valor: "—" }]
    : ids.map((id) => ({ etiqueta: etiquetaCategoria(id), valor: pesos(categorias?.find((c) => c.id === id)?.costoMensual ?? 0) }));
  const [editando, setEditando] = useState(false);
  return (
    <div className="border-t border-border pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="t-label">Costos por categoría</p>
        {costos ? (
          <Button type="button" variant="ghost" size="md" onClick={() => setEditando(true)}>
            Editar costos
          </Button>
        ) : null}
      </div>
      <Pares items={filas.map((c) => ({ etiqueta: c.etiqueta, valor: c.valor, numerico: true }))} />
      {costos && editando ? (
        <EditorCostosCategoria
          versionId={costos.versionId}
          puestos={costos.puestos}
          onCerrar={() => setEditando(false)}
          onGuardado={costos.onGuardado}
        />
      ) : null}
    </div>
  );
}

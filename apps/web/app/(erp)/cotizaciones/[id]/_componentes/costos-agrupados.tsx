"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { BloquePlegable, Button } from "@opai/ds";

import { etiquetaCategoria } from "@/lib/cpq-presentacion";
import { pesos } from "@/lib/fechas";

import type { CostosEditables } from "./panel-costos-categoria";

const EditorCostosCategoria = dynamic(
  () => import("./costos-categoria-editor").then((m) => m.EditorCostosCategoria),
  { ssr: false, loading: () => null },
);

const CATEGORIAS_MODELO = ["mano_obra", "feriados", "uniformes", "examenes", "colacion", "movilizacion", "equipamiento", "vehiculos"];

type Calculo = {
  categorias?: { id: string; costoMensual: number }[];
  lineas?: { id: string; categoria: string; costoMensual: number }[];
};

/**
 * Costos del mes agrupados por categoría (CAR-192): solo las que tienen monto, cada una plegable con su
 * detalle a un clic; «Agregar costo» para el resto. Nada de una lista larga de $0.
 */
export function CostosAgrupados(p: {
  calculo: Calculo;
  nombres: ReadonlyMap<string, string>;
  pendiente: boolean;
  costos?: CostosEditables;
}) {
  const [editando, setEditando] = useState(false);
  if (p.pendiente)
    return <p className="t-body text-fg-muted">Los costos aparecen cuando se completan los datos de los puestos.</p>;
  const todas = p.calculo.categorias ?? [];
  const conMonto = todas.filter((c) => c.costoMensual > 0);
  const sinMonto = CATEGORIAS_MODELO.filter((id) => !conMonto.some((c) => c.id === id));
  const total = conMonto.reduce((s, c) => s + c.costoMensual, 0);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="t-label">Costos del mes</p>
        <p className="t-label t-numeric">{pesos(total)}</p>
      </div>
      <div>
        {conMonto.map((c) => {
          const detalle = (p.calculo.lineas ?? []).filter((l) => l.categoria === c.id && l.costoMensual > 0);
          return (
            <BloquePlegable key={c.id} variante="fila" titulo={etiquetaCategoria(c.id)} derecha={pesos(c.costoMensual)}>
              <ul className="space-y-1">
                {detalle.length === 0 ? (
                  <li className="t-caption text-fg-muted">Sin detalle por línea.</li>
                ) : (
                  detalle.map((l) => (
                    <li key={l.id} className="flex justify-between gap-3 t-body-sm">
                      <span className="min-w-0 text-fg-muted">{p.nombres.get(l.id) ?? "Costo de la cotización"}</span>
                      <span className="t-numeric">{pesos(l.costoMensual)}</span>
                    </li>
                  ))
                )}
              </ul>
            </BloquePlegable>
          );
        })}
      </div>
      {p.costos ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="t-caption text-fg-subtle">
            {sinMonto.length > 0
              ? `${sinMonto.length} categorías sin monto (${sinMonto.slice(0, 2).map((id) => etiquetaCategoria(id).toLowerCase()).join(", ")}…)`
              : "Todas las categorías tienen monto."}
          </p>
          <Button type="button" variant="secondary" onClick={() => setEditando(true)}>
            Agregar costo
          </Button>
        </div>
      ) : null}
      {p.costos && editando ? (
        <EditorCostosCategoria
          versionId={p.costos.versionId}
          puestos={p.costos.puestos}
          onCerrar={() => setEditando(false)}
          onGuardado={p.costos.onGuardado}
        />
      ) : null}
    </div>
  );
}

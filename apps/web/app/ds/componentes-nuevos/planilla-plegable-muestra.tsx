"use client";

import { useState } from "react";

import { formatearClp } from "@opai/domain";
import { type EstadoPantalla, type FilaPlanilla, PlanillaScreen } from "@opai/ds";

const COLUMNAS = [
  { id: "s1", etiqueta: "16-11", destacada: true },
  { id: "s2", etiqueta: "23-11" },
  { id: "s3", etiqueta: "30-11" },
];
const MONTOS: Record<string, Record<string, number>> = {
  cobros: { s1: 1_850_000, s2: 920_000, s3: 2_400_000 },
  "cli-a": { s1: 1_500_000, s3: 2_400_000 },
  "ins-a1": { s1: 900_000, s3: 1_400_000 },
  "ins-a2": { s1: 600_000, s3: 1_000_000 },
  "cli-b": { s1: 350_000, s2: 920_000 },
};

/** Planilla con filas plegables (CAR-456): una fila abre su detalle por cliente y cada cliente sus instalaciones. */
export function PlanillaPlegableMuestra({ state }: { state: EstadoPantalla }) {
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(() => new Set(["cobros"]));
  const abierta = (id: string) => abiertas.has(id);
  const filas: FilaPlanilla[] = [
    { id: "cobros", etiqueta: "Cobros esperados", plegable: { abierta: abierta("cobros") } },
    ...(abierta("cobros")
      ? [
          { id: "cli-a", etiqueta: "Cementera Andina", sub: "2 instalaciones", nivel: 1 as const, plegable: { abierta: abierta("cli-a") } },
          ...(abierta("cli-a")
            ? [
                { id: "ins-a1", etiqueta: "Planta Norte", nivel: 2 as const },
                { id: "ins-a2", etiqueta: "Planta Sur", nivel: 2 as const },
              ]
            : []),
          { id: "cli-b", etiqueta: "Bodegas del Sur", nivel: 1 as const },
        ]
      : []),
  ];
  return (
    <PlanillaScreen
      state={state}
      titulo="Flujo de caja"
      subtitulo="Ingresos por cliente e instalación"
      filas={filas}
      columnas={COLUMNAS}
      celda={(f, c) => {
        const m = MONTOS[f]?.[c];
        return m ? { texto: formatearClp(m), tono: "info", detalle: "Comprometido" } : null;
      }}
      onAlternarFila={(id) =>
        setAbiertas((prev) => {
          const sig = new Set(prev);
          if (sig.has(id)) sig.delete(id);
          else sig.add(id);
          return sig;
        })
      }
    />
  );
}

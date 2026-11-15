"use client";

import { cn } from "../cn";
import { CabeceraFila } from "./planilla-screen-cabecera-fila";
import {
  claseCeldaNumero,
  claseFondoFila,
  TONO,
  type Celda,
  type ColumnaPlanilla,
  type FilaPlanilla,
  type SeleccionPlanilla,
} from "./planilla-screen-types";

type Props = {
  filas: readonly FilaPlanilla[];
  columnas: readonly ColumnaPlanilla[];
  celda: (filaId: string, columnaId: string) => Celda | null;
  celdaEditable?: (filaId: string, columnaId: string) => boolean;
  onCelda?: (filaId: string, columnaId: string) => void;
  onAlternarFila?: (filaId: string) => void;
  onAccionFila?: (filaId: string) => void;
  onSeleccion: (seleccion: SeleccionPlanilla) => void;
};

type CeldaFilaProps = {
  fila: FilaPlanilla;
  columna: ColumnaPlanilla;
  valor: Celda | null;
  editable: boolean;
  onCelda?: (filaId: string, columnaId: string) => void;
  onSeleccion: (seleccion: SeleccionPlanilla) => void;
};

function CeldaFila({ fila, columna, valor, editable, onCelda, onSeleccion }: CeldaFilaProps) {
  const tono = valor?.tono ?? "neutro";
  const texto = valor?.texto ?? "—";
  const caja = cn("border-b border-border p-0.5", claseFondoFila(fila), fila.total && "border-t");
  if (!valor && !editable) {
    return <td className={caja} tabIndex={-1} />;
  }
  if (!editable) {
    return (
      <td className={caja}>
        <span
          tabIndex={-1}
          className={cn(
            "flex w-full items-center justify-center rounded-sm px-1",
            claseCeldaNumero,
            TONO[tono],
          )}
        >
          {texto}
        </span>
      </td>
    );
  }
  return (
    <td className={caja}>
      <button
        type="button"
        aria-label={`${fila.etiqueta}, ${columna.etiqueta}: ${texto}${valor?.detalle ? ` (${valor.detalle})` : ""}. Editar`}
        title="Editar"
        onClick={() => {
          onCelda?.(fila.id, columna.id);
          onSeleccion({
            fila,
            columna,
            celda: valor ?? { texto, tono: "neutro", detalle: "Planificar" },
          });
        }}
        className={cn(
          "flex w-full cursor-pointer items-center justify-center rounded-sm px-1",
          claseCeldaNumero,
          TONO[tono],
          "transition-shadow duration-150 hover:shadow-[inset_0_0_0_1px_var(--ds-accent)] motion-reduce:transition-none",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
        )}
      >
        {texto}
      </button>
    </td>
  );
}

export function PlanillaTabla({
  filas,
  columnas,
  celda,
  celdaEditable,
  onCelda,
  onAlternarFila,
  onAccionFila,
  onSeleccion,
}: Props) {
  return (
    <div className="max-h-[70dvh] min-w-0 overflow-auto rounded-lg border border-border bg-surface lg:min-w-0">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-20 min-w-40 border-r border-b border-border bg-surface px-3 py-2 text-left text-xs font-medium text-fg-subtle">
              &nbsp;
            </th>
            {columnas.map((c) => (
              <th
                key={c.id}
                className={cn(
                  "sticky top-0 z-10 min-w-[7.5rem] border-b border-border bg-surface px-1 py-2 text-center text-xs tabular-nums whitespace-nowrap",
                  c.destacada ? "text-accent" : "text-fg-subtle",
                )}
              >
                {c.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className="group">
              <CabeceraFila
                fila={f}
                {...(onAlternarFila ? { onAlternar: onAlternarFila } : {})}
                {...(onAccionFila ? { onAccion: onAccionFila } : {})}
              />
              {columnas.map((c) => (
                <CeldaFila
                  key={c.id}
                  fila={f}
                  columna={c}
                  valor={celda(f.id, c.id)}
                  editable={Boolean(onCelda && celdaEditable?.(f.id, c.id))}
                  {...(onCelda ? { onCelda } : {})}
                  onSeleccion={onSeleccion}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

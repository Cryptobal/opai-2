"use client";

import { cn } from "../cn";
import {
  claseCeldaNumero,
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
  onSeleccion: (seleccion: SeleccionPlanilla) => void;
};

export function PlanillaTabla({
  filas,
  columnas,
  celda,
  celdaEditable,
  onCelda,
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
            <tr key={f.id}>
              <th className="sticky left-0 z-10 border-r border-b border-border bg-surface px-3 py-1.5 text-left text-base font-medium text-fg">
                <div className="truncate">{f.etiqueta}</div>
                {f.sub ? <div className="text-xs font-normal text-fg-muted">{f.sub}</div> : null}
              </th>
              {columnas.map((c) => {
                const valor = celda(f.id, c.id);
                const editable = Boolean(onCelda && celdaEditable?.(f.id, c.id));
                const tono = valor?.tono ?? "neutro";
                const texto = valor?.texto ?? "—";
                if (!valor && !editable) {
                  return <td key={c.id} className="border-b border-border p-0.5" tabIndex={-1} />;
                }
                if (!editable) {
                  return (
                    <td key={c.id} className="border-b border-border p-0.5">
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
                  <td key={c.id} className="border-b border-border p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onCelda?.(f.id, c.id);
                        onSeleccion({
                          fila: f,
                          columna: c,
                          celda: valor ?? { texto, tono: "neutro", detalle: "Planificar" },
                        });
                      }}
                      className={cn(
                        "flex w-full items-center justify-center rounded-sm px-1",
                        claseCeldaNumero,
                        TONO[tono],
                      )}
                    >
                      {texto}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

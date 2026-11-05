"use client";

import { Button } from "@opai/ds";

import { pesos } from "../formato";
import { type Gasto, totalDe } from "./gasto";

/** Gastos agregados con el total corriente; cada uno se puede editar o quitar. */
export function ResumenGastos({
  gastos,
  onEditar,
  onQuitar,
}: {
  gastos: readonly Gasto[];
  onEditar: (clave: string) => void;
  onQuitar: (clave: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="t-label text-fg">Gastos en esta rendición ({gastos.length})</h3>
      <ul className="flex flex-col gap-2">
        {gastos.map((g, n) => (
          <li
            key={g.clave}
            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-3"
          >
            <div className="min-w-0">
              <p className="t-label text-fg">
                Gasto {n + 1} · {g.tipoDocumento === "factura" ? "Factura" : "Boleta"} {g.folio}
              </p>
              <p className="truncate text-base text-fg-muted">
                {g.proveedor} — {g.descripcion}
              </p>
              <div className="mt-1 flex gap-1">
                <Button variant="ghost" onClick={() => onEditar(g.clave)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => onQuitar(g.clave)}
                  aria-label={`Quitar el gasto ${n + 1}`}
                >
                  Quitar
                </Button>
              </div>
            </div>
            <span className="t-label shrink-0 tabular-nums text-fg">{pesos(Number(g.monto))}</span>
          </li>
        ))}
      </ul>
      <p
        className="flex items-baseline justify-between border-t border-border pt-3 text-fg"
        aria-live="polite"
      >
        <span className="t-label">Total</span>
        <span className="t-title tabular-nums">{pesos(totalDe(gastos))}</span>
      </p>
    </div>
  );
}

"use client";

import { Button } from "@opai/ds";

import { celdaAgregada, esFilaVirtual } from "./celda-agregada";
import { clp, type Planilla } from "./datos";

export function VistaMovilFlujo({
  planilla,
  gestiona,
  onCelda,
}: {
  planilla: Planilla;
  gestiona: boolean;
  onCelda: (filaId: string, semana: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-fg-muted">Saldo de hoy</p>
        <p className="text-2xl font-semibold text-fg">
          {clp(planilla.semanas[0]?.saldoFinal ?? planilla.ajustes.saldoInicial)}
        </p>
      </div>
      {planilla.semanas.map((s) => (
        <section key={s.semana} className="rounded-lg border border-border bg-surface p-4">
          <header className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-medium text-fg">Semana {s.semana.slice(8, 10)}-{s.semana.slice(5, 7)}</h2>
            <span className="text-sm text-fg-muted">
              {s.pasada ? `Cartola · ${clp(s.saldoFinal)}` : clp(s.saldoFinal)}
            </span>
          </header>
          <ul className="flex flex-col gap-1 text-sm">
            {planilla.filas.map((f) => {
              const c = celdaAgregada(planilla.celdas, f.id, s.semana, s.pasada);
              const monto = c && !c.soloPlanSinRespaldo ? clp(c.monto) : "—";
              return (
                <li key={f.id} className="flex justify-between gap-2 border-b border-border py-1 last:border-0">
                  <span>{f.etiqueta}</span>
                  {gestiona && !esFilaVirtual(f.id) && (!c || c.capa === "plan") && !s.pasada ? (
                    <Button variant="ghost" onClick={() => onCelda(f.id, s.semana)}>
                      {monto}
                    </Button>
                  ) : (
                    <span className="text-fg-muted">{monto}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

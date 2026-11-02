"use client";

import { Button } from "@opai/ds";

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
            <span className="text-sm text-fg-muted">{s.sellada ? "Sellada" : clp(s.saldoFinal)}</span>
          </header>
          <ul className="flex flex-col gap-1 text-sm">
            {planilla.filas.map((f) => {
              const c = planilla.celdas.find((x) => x.filaId === f.id && x.semana === s.semana);
              return (
                <li key={f.id} className="flex justify-between gap-2 border-b border-border py-1 last:border-0">
                  <span>{f.etiqueta}</span>
                  {gestiona && (!c || c.capa === "plan") && !s.sellada ? (
                    <Button variant="ghost" onClick={() => onCelda(f.id, s.semana)}>
                      {c ? clp(c.monto) : "—"}
                    </Button>
                  ) : (
                    <span className="text-fg-muted">{c ? clp(c.monto) : "—"}</span>
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

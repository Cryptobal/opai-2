"use client";

import { ChevronRight } from "lucide-react";

import { Button, cn, type FilaPlanilla } from "@opai/ds";

import { clp, type ArmadoPlanilla, type Planilla } from "./datos";

const SANGRIA = { 0: "", 1: "pl-4", 2: "pl-8" } as const;

type Acciones = {
  armado: ArmadoPlanilla;
  onCelda: (filaId: string, semana: string) => void;
  onAlternar: (filaId: string) => void;
};

function FilaSemana({ f, semana, armado, onCelda, onAlternar }: Acciones & { f: FilaPlanilla; semana: string }) {
  const monto = armado.celda(f.id, semana)?.texto ?? "—";
  const nivel = f.nivel ?? 0;
  const etiqueta = (
    <span className="min-w-0 flex-1 text-left">
      <span className={cn("block truncate", nivel === 0 && "font-medium text-fg")}>{f.etiqueta}</span>
      {f.sub ? <span className="block truncate text-xs text-fg-muted">{f.sub}</span> : null}
    </span>
  );
  return (
    <li className={cn("flex min-h-11 items-center justify-between gap-2 border-b border-border last:border-0", SANGRIA[nivel])}>
      {f.plegable ? (
        <Button
          variant="ghost"
          aria-expanded={f.plegable.abierta}
          aria-label={`${f.plegable.abierta ? "Ocultar" : "Ver"} detalle de ${f.etiqueta}`}
          onClick={() => onAlternar(f.id)}
          className="min-w-0 flex-1 justify-start gap-1 px-1 font-normal"
        >
          <ChevronRight aria-hidden className={cn("size-4 shrink-0 text-fg-subtle transition-transform motion-reduce:transition-none", f.plegable.abierta && "rotate-90")} />
          {etiqueta}
        </Button>
      ) : (
        etiqueta
      )}
      {armado.celdaEditable(f.id, semana) ? (
        <Button variant="ghost" onClick={() => onCelda(f.id, semana)}>{monto}</Button>
      ) : (
        <span className="text-fg-muted tabular-nums">{monto}</span>
      )}
    </li>
  );
}

export function VistaMovilFlujo({ planilla, ...acciones }: Acciones & { planilla: Planilla }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-fg-muted">Saldo de hoy</p>
        <p className="text-2xl font-semibold text-fg">{clp(planilla.semanas[0]?.saldoFinal ?? 0)}</p>
      </div>
      {planilla.semanas.map((s) => (
        <section key={s.semana} className="rounded-lg border border-border bg-surface p-4">
          <header className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-medium text-fg">Semana {s.semana.slice(8, 10)}-{s.semana.slice(5, 7)}</h2>
            <span className="text-sm text-fg-muted">{s.pasada ? `Cartola · ${clp(s.saldoFinal)}` : clp(s.saldoFinal)}</span>
          </header>
          <ul className="flex flex-col text-sm">
            {acciones.armado.filas.map((f) => (
              <FilaSemana key={f.id} f={f} semana={s.semana} {...acciones} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

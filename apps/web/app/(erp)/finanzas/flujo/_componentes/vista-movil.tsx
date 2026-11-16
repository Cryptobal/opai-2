"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button, cn, type FilaPlanilla } from "@opai/ds";

import { esFilaVirtual } from "./celda-agregada";
import { clp, type ArmadoPlanilla, type Planilla } from "./datos";
import { HojaMover } from "./hoja-mover";

const SANGRIA = { 0: "", 1: "pl-4", 2: "pl-8" } as const;

type Acciones = {
  armado: ArmadoPlanilla;
  onCelda: (filaId: string, semana: string) => void;
  onAlternar: (filaId: string) => void;
  onAccion?: (filaId: string) => void;
};

function FilaSemana({ f, semana, armado, onCelda, onAlternar, onAccion }: Acciones & { f: FilaPlanilla; semana: string }) {
  const monto = armado.celda(f.id, semana)?.texto ?? "—";
  const nivel = f.nivel ?? 0;
  const encabezado = nivel === 0 || Boolean(f.plegable) || Boolean(f.total);
  const etiqueta = (
    <span className="min-w-0 flex-1 text-left">
      <span className={cn("block truncate", encabezado ? "font-medium text-fg" : "text-fg-muted", f.total && "font-semibold")}>{f.etiqueta}</span>
      {f.sub ? <span className="block truncate text-xs text-fg-muted">{f.sub}</span> : null}
    </span>
  );
  return (
    <li className={cn("flex min-h-11 items-center justify-between gap-2 border-b border-border last:border-0", SANGRIA[nivel], (nivel === 0 || f.total) && "rounded-sm bg-fill px-1")}>
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
      {f.accion && onAccion ? (
        <Button variant="ghost" className="px-2" aria-label={`${f.accion} ${f.etiqueta}`} onClick={() => onAccion(f.id)}>
          {f.accion}
        </Button>
      ) : null}
      {armado.celdaEditable(f.id, semana) ? (
        <Button variant="ghost" onClick={() => onCelda(f.id, semana)}>{monto}</Button>
      ) : (
        <span className={cn("tabular-nums", encabezado ? "font-medium text-fg" : "text-fg-muted")}>{monto}</span>
      )}
    </li>
  );
}

export function VistaMovilFlujo({
  planilla,
  armado,
  gestiona,
  onCelda,
  onAlternar,
}: {
  planilla: Planilla;
  armado: ArmadoPlanilla;
  gestiona: boolean;
  onCelda: Acciones["onCelda"];
  onAlternar: Acciones["onAlternar"];
}) {
  const [mover, setMover] = useState<string | null>(null);
  const conPlan = new Set(planilla.filas.filter((f) => !esFilaVirtual(f.id)).map((f) => f.id));
  const filas = armado.filas.map((f) => (gestiona && conPlan.has(f.id) ? { ...f, accion: "Reprogramar" } : f));
  const acciones = { armado, onCelda, onAlternar, onAccion: setMover };
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
            {filas.map((f) => (
              <FilaSemana key={f.id} f={f} semana={s.semana} {...acciones} />
            ))}
          </ul>
        </section>
      ))}
      {mover ? (
        <HojaMover
          filas={planilla.filas.filter((f) => conPlan.has(f.id))}
          semanas={planilla.semanas.map((s) => s.semana)}
          semanasPasadas={planilla.semanas.filter((s) => s.pasada).map((s) => s.semana)}
          horizonte={planilla.semanas.length}
          filaInicial={mover}
          onCerrar={() => setMover(null)}
        />
      ) : null}
    </div>
  );
}

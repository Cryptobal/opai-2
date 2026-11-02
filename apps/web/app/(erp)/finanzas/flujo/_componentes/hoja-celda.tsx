"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Sheet, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { clp } from "./datos";

type Contexto = {
  fila: { id: string; etiqueta: string; seccion: string };
  semana: string;
  celda: { id: string; monto: number; nota: string | null } | null;
};

export function HojaCelda({
  abierta,
  onCerrar,
  contexto,
}: {
  abierta: boolean;
  onCerrar: () => void;
  contexto: Contexto | null;
}) {
  if (!abierta || !contexto) return null;
  return (
    <HojaCeldaForm
      key={`${contexto.fila.id}-${contexto.semana}`}
      onCerrar={onCerrar}
      contexto={contexto}
    />
  );
}

function HojaCeldaForm({ onCerrar, contexto }: { onCerrar: () => void; contexto: Contexto }) {
  const ctx = contexto;
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [monto, setMonto] = useState(String(ctx.celda?.monto ?? 0));
  const [nota, setNota] = useState(ctx.celda?.nota ?? "");

  async function guardar() {
    const m = Number(monto.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(m) || m < 0) return;
    const r = await ejecutar("finanzas.celdas.fijar", {
      filaId: ctx.fila.id,
      semana: ctx.semana,
      monto: Math.round(m),
      nota: nota.trim() || undefined,
    });
    if (!r) return;
    avisar.exito("Celda guardada");
    onCerrar();
  }

  async function cumplir() {
    if (!ctx.celda) return;
    const r = await ejecutar("finanzas.celdas.cumplir", { id: ctx.celda.id });
    if (!r) return;
    avisar.exito("Celda dada por cumplida");
    onCerrar();
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={ctx.fila.etiqueta}
      descripcion={`Semana ${ctx.semana} · ${ctx.fila.seccion}`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          {ctx.celda ? (
            <Button variant="secondary" disabled={pendiente} onClick={() => void cumplir()}>
              Dar por cumplida
            </Button>
          ) : null}
          <Button disabled={pendiente} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Monto (CLP)" htmlFor="fc-monto">
          <Input id="fc-monto" value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="numeric" />
        </Campo>
        <Campo etiqueta="Nota" htmlFor="fc-nota">
          <Textarea id="fc-nota" value={nota} onChange={(e) => setNota(e.target.value)} rows={3} />
        </Campo>
        {ctx.celda ? (
          <p className="text-sm text-fg-muted">Actual: {clp(ctx.celda.monto)}</p>
        ) : null}
      </div>
    </Sheet>
  );
}

"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Sheet, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { clp } from "./datos";
import { parsearMontoUi } from "./monto-ui";

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
      key={`${contexto.fila.id}-${contexto.semana}-${contexto.celda?.id ?? "nueva"}`}
      onCerrar={onCerrar}
      contexto={contexto}
    />
  );
}

function HojaCeldaForm({ onCerrar, contexto }: { onCerrar: () => void; contexto: Contexto }) {
  const ctx = contexto;
  const { ejecutar, pendiente, error, codigo, limpiarError } = useCapacidad("erp");
  const [monto, setMonto] = useState(String(ctx.celda?.monto ?? 0));
  const [errorMonto, setErrorMonto] = useState<string | null>(null);
  const [nota, setNota] = useState(ctx.celda?.nota ?? "");
  const [celdaActual, setCeldaActual] = useState(ctx.celda);

  async function guardar() {
    const m = parsearMontoUi(monto);
    if (!m.ok) {
      setErrorMonto(m.error);
      return;
    }
    setErrorMonto(null);
    limpiarError();
    const r = await ejecutar<{
      id: string;
      monto: number;
      nota: string | null;
    }>("finanzas.celdas.fijar", {
      filaId: ctx.fila.id,
      semana: ctx.semana,
      monto: m.monto,
      nota: nota.trim() || undefined,
    });
    if (!r) return;
    setCeldaActual({ id: r.id, monto: r.monto, nota: r.nota });
    setMonto(String(r.monto));
    avisar.exito("Celda guardada");
    onCerrar();
  }

  async function cumplir() {
    if (!celdaActual) return;
    const r = await ejecutar("finanzas.celdas.cumplir", { id: celdaActual.id });
    if (!r) return;
    avisar.exito("Celda dada por cumplida");
    onCerrar();
  }

  const errorServidor = codigo === "INTERNAL";

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={ctx.fila.etiqueta}
      descripcion={`Semana ${ctx.semana} · ${ctx.fila.seccion}`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          {celdaActual ? (
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
        {error ? (
          <Alerta tono="danger" titulo={errorServidor ? "No pudimos completar la acción. Reintenta; si sigue igual, avisa a un administrador." : error}>
            {errorServidor ? (
              <Button variant="secondary" className="mt-2" onClick={() => void guardar()}>
                Reintentar
              </Button>
            ) : null}
          </Alerta>
        ) : null}
        <Campo etiqueta="Monto (CLP)" htmlFor="fc-monto" error={errorMonto ?? undefined}>
          <Input id="fc-monto" value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="numeric" />
        </Campo>
        <Campo etiqueta="Nota" htmlFor="fc-nota">
          <Textarea id="fc-nota" value={nota} onChange={(e) => setNota(e.target.value)} rows={3} />
        </Campo>
        {celdaActual ? (
          <p className="text-sm tabular-nums whitespace-nowrap text-fg-muted">
            Actual: {clp(celdaActual.monto)}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}

"use client";

import { diferenciaAsignada, prorratearAbono } from "@opai/domain";
import { Alerta, Button, Input } from "@opai/ds";

import { clp } from "../../flujo/_componentes/datos";
import type { Elegida } from "./seleccion-conciliacion";

/** Montos asignados a cada documento elegido y lo que falta para cuadrar con el abono. */
export function PanelProrrateo({ abono, elegidas, onCambiar }: { abono: number; elegidas: Elegida[]; onCambiar: (e: Elegida[]) => void }) {
  if (elegidas.length === 0) return null;
  const dif = diferenciaAsignada(abono, elegidas);
  const prorratear = () => {
    const { asignaciones } = prorratearAbono(abono, elegidas);
    onCambiar(elegidas.map((e, i) => ({ ...e, monto: asignaciones[i]?.monto ?? 0 })));
  };
  return (
    <section aria-label="Montos por documento" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="t-body-sm font-medium">Reparto del abono</h3>
        <Button variant="secondary" onClick={prorratear}>Prorratear</Button>
      </div>
      {elegidas.map((e) => (
        <div key={e.id} className="flex items-center gap-2">
          <span className="t-body-sm min-w-0 flex-1">
            {e.etiqueta}
            <span className="t-caption block text-fg-muted">Pendiente {clp(e.pendiente)}</span>
          </span>
          <Input
            aria-label={`Monto para ${e.etiqueta}`}
            className="w-32"
            inputMode="numeric"
            value={e.monto ? String(e.monto) : ""}
            onChange={(ev) => {
              const v = Math.min(Number(ev.target.value.replace(/\D/g, "")) || 0, e.pendiente);
              onCambiar(elegidas.map((x) => (x.id === e.id ? { ...x, monto: v } : x)));
            }}
          />
        </div>
      ))}
      {dif === 0 ? (
        <Alerta tono="success" titulo="El reparto cuadra con el abono" />
      ) : (
        <Alerta tono="warning" titulo={dif > 0 ? `Faltan ${clp(dif)} por asignar` : `Te pasaste por ${clp(-dif)}`} />
      )}
    </section>
  );
}

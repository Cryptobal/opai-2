"use client";

import { useState } from "react";

import { avisar, Button, Input } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

export type FilaReferencia = {
  cargoId: string;
  cargo: string;
  sueldoBaseClp?: number | null | undefined;
  vigenteDesde: string | null;
  cotizacionesAbiertas: number;
};

function Fila({ f }: { f: FilaReferencia }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [valor, setValor] = useState(f.sueldoBaseClp != null ? String(f.sueldoBaseClp) : "");
  async function fijar() {
    const n = Number.parseInt(valor.replace(/\D/g, ""), 10);
    if (!Number.isFinite(n)) return;
    const r = await ejecutar("cpq.sueldos_referencia.fijar", { cargoId: f.cargoId, sueldoBaseClp: n });
    if (r != null) avisar.exito(`Sueldo de referencia de ${f.cargo} actualizado`);
  }
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
      <span className="t-body-sm">
        {f.cargo}
        <span className="t-caption block text-fg-muted">
          {f.vigenteDesde ? `Vigente desde ${f.vigenteDesde}` : "Sin referencia"}
          {f.cotizacionesAbiertas > 0 ? ` · ${f.cotizacionesAbiertas} cotizaciones abiertas` : ""}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <Input
          aria-label={`Sueldo de referencia de ${f.cargo}`}
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <Button type="button" variant="secondary" disabled={pendiente} onClick={() => void fijar()}>
          Fijar
        </Button>
      </span>
      {error ? <p className="t-caption text-danger w-full">{error}</p> : null}
    </li>
  );
}

/** Sueldos de referencia para cotizar (supuesto de venta, no lo que se paga). Solo con `cpq:costos.ver`. */
export function SueldosReferenciaCpq({ filas }: { filas: readonly FilaReferencia[] }) {
  return (
    <div className="space-y-3">
      <h3 className="t-h3">Sueldos de referencia para cotizar</h3>
      <p className="t-body-sm text-fg-muted">
        Supuesto de venta por cargo: no es el sueldo que se paga. Cambiarlo no toca las cotizaciones enviadas.
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {filas.map((f) => (
          <Fila key={f.cargoId} f={f} />
        ))}
      </ul>
    </div>
  );
}

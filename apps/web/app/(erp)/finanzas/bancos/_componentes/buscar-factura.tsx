"use client";

import { useState } from "react";

import { Button, Campo, Input } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { clp } from "../../flujo/_componentes/datos";
import { etiquetaDoc, type Elegida } from "./seleccion-conciliacion";

type Venta = { id: string; folio: number | null; tipoDte: number; cuentaNombre: string; montoTotal: number; montoCobrado: number; montoPendiente: number; estadoCobro: string };

/** Busca una factura emitida por folio para sumarla al abono (reemplaza pegar el id del documento). */
export function BuscarFactura({ elegidas, onAgregar }: { elegidas: Elegida[]; onAgregar: (e: Elegida) => void }) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [folio, setFolio] = useState("");
  const [res, setRes] = useState<Venta[] | null>(null);
  const n = Number(folio);

  async function buscar() {
    const r = await ejecutar<{ items: Venta[] }>("finanzas.ventas.buscar", { folio: n, limite: 10 }, false, "ninguna");
    setRes(r ? r.items.filter((v) => v.estadoCobro !== "pagada") : []);
  }
  return (
    <div className="flex flex-col gap-2">
      <Campo etiqueta="Agregar otra factura por folio" htmlFor="banco-folio">
        <div className="flex gap-2">
          <Input id="banco-folio" inputMode="numeric" value={folio} onChange={(e) => setFolio(e.target.value.replace(/\D/g, ""))} placeholder="N° de folio" />
          <Button variant="secondary" disabled={pendiente || !Number.isInteger(n) || n <= 0} onClick={() => void buscar()}>Buscar</Button>
        </div>
      </Campo>
      {res?.length === 0 ? <p className="t-caption text-fg-muted">No hay una factura con saldo con ese folio.</p> : null}
      {res?.map((v) => (
        <div key={v.id} className="rowcard flex flex-wrap items-center gap-2 p-3">
          <p className="t-body-sm min-w-0 flex-1">
            {etiquetaDoc(v.folio, v.cuentaNombre, v.tipoDte)}
            <span className="t-caption block text-fg-muted">Pendiente {clp(v.montoPendiente)}</span>
          </p>
          <Button variant="secondary" disabled={elegidas.some((x) => x.id === v.id)}
            onClick={() => onAgregar({ id: v.id, tipo: "documento_emitido", etiqueta: etiquetaDoc(v.folio, v.cuentaNombre, v.tipoDte), pendiente: v.montoPendiente, monto: 0 })}>
            Agregar
          </Button>
        </div>
      ))}
    </div>
  );
}

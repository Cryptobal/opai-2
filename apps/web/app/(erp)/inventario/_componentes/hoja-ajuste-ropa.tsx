"use client";

import { useState } from "react";

import { Alerta, avisar, Campo, Input, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { AccionesHoja } from "./acciones-hoja";

/** Ajuste tras un conteo (R17): fija la cantidad real de una talla con su motivo. */
export function HojaAjusteRopa({ tipoId, existencias }: { tipoId: string; existencias: { talla: string; cantidad: number }[] }) {
  const hoja = useHojaUrl("ajustar");
  const talla = hoja.valor ?? "";
  const actual = existencias.find((e) => e.talla === talla)?.cantidad ?? 0;
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [cantidad, setCantidad] = useState(String(actual));
  const [motivo, setMotivo] = useState("");
  const nueva = Number(cantidad);
  const listo = cantidad !== "" && Number.isInteger(nueva) && nueva !== actual && motivo.trim().length >= 3;

  async function guardar() {
    const r = await ejecutar("inventario.ropa.ajustar", { tipoId, talla, cantidad: nueva, motivo: motivo.trim() });
    if (!r) return;
    avisar.exito("Existencia ajustada");
    hoja.cerrar();
  }

  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={`Ajustar talla ${talla}`}
      acciones={<AccionesHoja onCancelar={hoja.cerrar} onGuardar={() => void guardar()} listo={listo} pendiente={pendiente} texto="Ajustar" />}
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <p className="t-caption">Hoy hay {actual} unidades. Escribe la cantidad que contaste.</p>
        <Campo etiqueta="Cantidad real" htmlFor="aj-cantidad">
          <Input id="aj-cantidad" inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ""))} />
        </Campo>
        <Campo etiqueta="Motivo" htmlFor="aj-motivo">
          <Input id="aj-motivo" value={motivo} placeholder="Por ejemplo: conteo mensual, prendas dañadas" onChange={(e) => setMotivo(e.target.value)} />
        </Campo>
      </div>
    </Sheet>
  );
}

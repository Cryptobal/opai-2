"use client";

import { useState } from "react";

import { avisar, Button, Campo, Input, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

export function HojaAgregarPuesto({
  seccionId,
  onCerrar,
  onCreado,
}: {
  seccionId: string;
  onCerrar: () => void;
  onCreado: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombre, setNombre] = useState("Guardia");
  const [posiciones, setPosiciones] = useState("1");
  const [sueldo, setSueldo] = useState("");

  async function guardar() {
    const pos = Number.parseInt(posiciones, 10);
    const sueldoN = sueldo.trim() ? Number.parseInt(sueldo.replace(/\D/g, ""), 10) : undefined;
    const r = await ejecutar("cpq.lineas.crear", {
      seccionId,
      tipo: "puesto",
      nombre: nombre.trim() || "Puesto",
      posiciones: Number.isFinite(pos) && pos > 0 ? pos : 1,
      ...(sueldoN != null && Number.isFinite(sueldoN) ? { sueldoBaseClp: sueldoN } : {}),
    });
    if (r != null) {
      avisar.exito("Puesto agregado");
      onCreado();
      onCerrar();
    }
  }

  return (
    <Sheet abierto titulo="Agregar puesto" onCerrar={onCerrar}>
      <div className="space-y-4 p-4">
        <Campo etiqueta="Nombre del puesto" htmlFor="cpq-puesto-nombre">
          <Input id="cpq-puesto-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo etiqueta="Posiciones" htmlFor="cpq-puesto-pos">
          <Input
            id="cpq-puesto-pos"
            inputMode="numeric"
            value={posiciones}
            onChange={(e) => setPosiciones(e.target.value)}
          />
        </Campo>
        <Campo
          etiqueta="Sueldo base (CLP)"
          htmlFor="cpq-puesto-sueldo"
          ayuda="Opcional; sin sueldo el costo queda pendiente."
        >
          <Input
            id="cpq-puesto-sueldo"
            inputMode="numeric"
            placeholder="Ej. 650000"
            value={sueldo}
            onChange={(e) => setSueldo(e.target.value)}
          />
        </Campo>
        {error ? <p className="t-caption text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" disabled={pendiente} onClick={() => void guardar()}>
            Agregar
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

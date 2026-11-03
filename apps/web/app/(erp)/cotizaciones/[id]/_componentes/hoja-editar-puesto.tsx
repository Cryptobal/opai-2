"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

export function HojaEditarPuesto({
  linea,
  onCerrar,
  onGuardado,
}: {
  linea: {
    id: string;
    nombre: string;
    posiciones?: number;
    sueldoBaseClp?: number;
  };
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombre, setNombre] = useState(linea.nombre);
  const [posiciones, setPosiciones] = useState(String(linea.posiciones ?? 1));
  const [sueldo, setSueldo] = useState(
    linea.sueldoBaseClp != null ? String(linea.sueldoBaseClp) : "",
  );

  async function guardar() {
    const pos = Number.parseInt(posiciones, 10);
    const sueldoN = sueldo.trim() ? Number.parseInt(sueldo.replace(/\D/g, ""), 10) : undefined;
    const r = await ejecutar("cpq.lineas.actualizar", {
      id: linea.id,
      nombre: nombre.trim() || linea.nombre,
      posiciones: Number.isFinite(pos) && pos > 0 ? pos : undefined,
      ...(sueldoN != null && Number.isFinite(sueldoN) ? { sueldoBaseClp: sueldoN } : {}),
    });
    if (r != null) {
      avisar.exito("Puesto actualizado");
      onGuardado();
      onCerrar();
    }
  }

  return (
    <Sheet abierto titulo="Editar puesto" onCerrar={onCerrar}>
      <div className="space-y-4 p-4">
        <Campo etiqueta="Nombre del puesto" htmlFor="cpq-edit-nombre">
          <Input id="cpq-edit-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo etiqueta="Posiciones" htmlFor="cpq-edit-pos">
          <Input
            id="cpq-edit-pos"
            inputMode="numeric"
            value={posiciones}
            onChange={(e) => setPosiciones(e.target.value)}
          />
        </Campo>
        <Campo
          etiqueta="Sueldo base (CLP)"
          htmlFor="cpq-edit-sueldo"
          ayuda="Sin sueldo el costo laboral queda pendiente."
        >
          <Input
            id="cpq-edit-sueldo"
            inputMode="numeric"
            placeholder="Ej. 650000"
            value={sueldo}
            onChange={(e) => setSueldo(e.target.value)}
          />
        </Campo>
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" disabled={pendiente} onClick={() => void guardar()}>
            Guardar
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

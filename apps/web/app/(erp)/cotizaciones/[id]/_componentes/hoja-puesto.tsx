"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { LineaEditable } from "../../_componentes/puesto-tipos";
import { CamposPuesto } from "./campos-puesto";
import { entradaDePuesto, estadoInicial, type EstadoPuesto } from "./puesto-form";

/** Hoja de puesto: crea (con `seccionId`) o edita (con `linea`) el mismo formulario (CPQ v4 §4.2). */
export function HojaPuesto({
  seccionId,
  linea,
  verCostos,
  onCerrar,
  onListo,
}: {
  seccionId?: string;
  linea?: LineaEditable;
  verCostos: boolean;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [e, setE] = useState<EstadoPuesto>(() => estadoInicial(linea));

  async function guardar() {
    const entrada = entradaDePuesto(e, verCostos);
    const r = linea
      ? await ejecutar("cpq.lineas.actualizar", { id: linea.id, ...entrada })
      : await ejecutar("cpq.lineas.crear", { seccionId, tipo: "puesto", ...entrada });
    if (r != null) {
      avisar.exito(linea ? "Puesto actualizado" : "Puesto agregado");
      onListo();
      onCerrar();
    }
  }

  return (
    <Sheet abierto titulo={linea ? "Editar puesto" : "Agregar puesto"} onCerrar={onCerrar}>
      <CamposPuesto e={e} set={(c) => setE((p) => ({ ...p, ...c }))} verCostos={verCostos} />
      <div className="space-y-3 px-4 pb-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" disabled={pendiente} onClick={() => void guardar()}>
            {linea ? "Guardar" : "Agregar"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

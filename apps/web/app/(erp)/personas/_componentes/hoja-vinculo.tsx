"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import {
  CamposVinculo,
  conTermino,
  type DatosVinculo,
  vinculoInvalido,
  vinculoVacio,
} from "./campos-vinculo";

import type { OpcionesDestino } from "./campos-destino-vinculo";

type Props = Partial<OpcionesDestino> & {
  personaId: string;
  cargos: { valor: string; etiqueta: string }[];
  hoy: string;
};

/** Nuevo vínculo laboral para una persona sin vínculo vigente (recontratación). */
export function HojaVinculo({ personaId, cargos, hoy, ...opciones }: Props) {
  const hoja = useHojaUrl("vinculo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [v, setV] = useState<DatosVinculo>(() => vinculoVacio(hoy));
  async function guardar() {
    const r = await ejecutar("core.vinculos.create", {
      personaId,
      instalacionId: v.instalacionId,
      puestoId: v.puestoId || null,
      horasSemanales: Number(v.horasSemanales),
      distribucion: v.distribucion,
      cargoId: v.cargoId,
      tipo: v.tipo,
      inicio: v.inicio,
      ...(conTermino(v.tipo) ? { termino: v.termino } : {}),
    });
    if (!r) return;
    avisar.exito("Vínculo creado");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Nuevo vínculo"
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || vinculoInvalido(v)} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Crear vínculo"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <CamposVinculo {...opciones} v={v} onCambiar={setV} cargos={cargos} />
      </div>
    </Sheet>
  );
}

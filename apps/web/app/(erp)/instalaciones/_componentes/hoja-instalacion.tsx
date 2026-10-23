"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { Instalacion } from "@/lib/tipos-maestros";

import {
  CamposInstalacion,
  camposAInput,
  inicialInstalacion,
  invalidaInstalacion,
} from "./campos-instalacion";

/** Editar instalación (Sheet): nombre, dirección y mapa, geocerca, vigencia y notas. */
export function HojaInstalacion({ instalacion }: { instalacion: Instalacion }) {
  const hoja = useHojaUrl("editar");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [d, setD] = useState(() => inicialInstalacion(instalacion));
  async function guardar() {
    if (await ejecutar("core.instalaciones.update", { id: instalacion.id, ...camposAInput(d) })) {
      avisar.exito("Instalación actualizada");
      hoja.cerrar();
    }
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Editar instalación"
      telefono="completo"
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || invalidaInstalacion(d)} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <CamposInstalacion d={d} setD={setD} />
      </div>
    </Sheet>
  );
}

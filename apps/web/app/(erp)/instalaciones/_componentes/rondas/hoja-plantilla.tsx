"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { CamposPlantilla } from "./campos-plantilla";
import { type DatosPlantilla, inicialPlantilla, plantillaAInput, puntosElegidos } from "./hoja-plantilla-datos";
import type { Plantilla, Punto } from "./tipos";

/** Nueva o editar plantilla (c13t) en Sheet, abierta por `?plantilla=nueva|<id>`. */
export function HojaPlantilla({
  instalacionId,
  plantillas,
  puntos,
}: {
  instalacionId: string;
  plantillas: readonly Plantilla[];
  puntos: readonly Punto[];
}) {
  const hoja = useHojaUrl("plantilla");
  if (!hoja.abierta) return null;
  const actual = plantillas.find((p) => p.id === hoja.valor) ?? null;
  return (
    <Formulario
      key={hoja.valor ?? "nueva"}
      instalacionId={instalacionId}
      actual={actual}
      puntos={puntos}
      onCerrar={hoja.cerrar}
    />
  );
}

function Formulario({
  instalacionId,
  actual,
  puntos,
  onCerrar,
}: {
  instalacionId: string;
  actual: Plantilla | null;
  puntos: readonly Punto[];
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [d, setD] = useState<DatosPlantilla>(() => inicialPlantilla(actual, puntos));
  const editar = actual !== null;
  const invalido = d.nombre.trim().length < 2 || puntosElegidos(d).length === 0;

  async function guardar() {
    const input = plantillaAInput(d, instalacionId, actual?.id ?? null);
    const r = editar
      ? await ejecutar("rondas.plantillas.actualizar", input)
      : await ejecutar("rondas.plantillas.crear", input);
    if (r) {
      avisar.exito(editar ? "Plantilla actualizada" : "Plantilla creada");
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={editar ? `Editar plantilla · ${actual.nombre}` : "Nueva plantilla"}
      descripcion="Elige los puntos, su orden y los tiempos de la ronda."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} cargando={pendiente} disabled={invalido}>
            Guardar plantilla
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <CamposPlantilla d={d} setD={setD} puntos={puntos} />
      </div>
    </Sheet>
  );
}

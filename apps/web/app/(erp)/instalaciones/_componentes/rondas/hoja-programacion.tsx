"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { CamposProgramacion } from "./campos-programacion";
import { type DatosProgramacion, inicialProgramacion, programacionAInput } from "./hoja-programacion-datos";
import type { Plantilla, Programacion } from "./tipos";

/** Nueva o editar programación (c13s) en Sheet, abierta por `?programacion=nueva|<id>`. */
export function HojaProgramacion({
  instalacionId,
  programaciones,
  plantillas,
}: {
  instalacionId: string;
  programaciones: readonly Programacion[];
  plantillas: readonly Plantilla[];
}) {
  const hoja = useHojaUrl("programacion");
  if (!hoja.abierta) return null;
  const actual = programaciones.find((p) => p.id === hoja.valor) ?? null;
  return (
    <Formulario
      key={hoja.valor ?? "nueva"}
      instalacionId={instalacionId}
      actual={actual}
      plantillas={plantillas}
      onCerrar={hoja.cerrar}
    />
  );
}

function Formulario({
  instalacionId,
  actual,
  plantillas,
  onCerrar,
}: {
  instalacionId: string;
  actual: Programacion | null;
  plantillas: readonly Plantilla[];
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [d, setD] = useState<DatosProgramacion>(() =>
    inicialProgramacion(actual, plantillas[0]?.id ?? ""),
  );
  const editar = actual !== null;
  const invalido = d.nombre.trim().length < 2 || d.plantillaId === "" || d.horarios.every((h) => h.trim() === "");

  async function guardar() {
    const r = await ejecutar("rondas.programaciones.fijar", programacionAInput(d, instalacionId, actual?.id ?? null));
    if (r) {
      avisar.exito(editar ? "Programación actualizada" : "Programación creada");
      onCerrar();
    }
  }

  async function alternarPausa() {
    const pausada = actual?.estado === "activa";
    if (await ejecutar("rondas.programaciones.pausar", { id: actual?.id, pausada })) {
      avisar.exito(pausada ? "Programación pausada" : "Programación reactivada");
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={editar ? `Editar programación · ${actual.nombre}` : "Nueva programación"}
      descripcion="Fija cuándo se ejecuta la plantilla y con qué tolerancia."
      acciones={
        <>
          {editar ? (
            <Button variant="ghost" onClick={alternarPausa} cargando={pendiente}>
              {actual.estado === "activa" ? "Pausar" : "Reactivar"}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} cargando={pendiente} disabled={invalido}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <CamposProgramacion d={d} setD={setD} plantillas={plantillas} />
      </div>
    </Sheet>
  );
}

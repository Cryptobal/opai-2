"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { FuncionPuestoOpcion, PatronTurnoOpcion, Puesto } from "@/lib/tipos-maestros";

import { CamposPuesto, inicialPuesto, puestoAInput } from "./campos-puesto";

type Props = {
  instalacionId: string;
  puestos: Puesto[];
  cargos: { valor: string; etiqueta: string }[];
  funciones: FuncionPuestoOpcion[];
  patrones: PatronTurnoOpcion[];
};

/** Nuevo o editar puesto (09) en Sheet, abierto por `?puesto=nuevo|<id>`. */
export function HojaPuesto({ instalacionId, puestos, cargos, funciones, patrones }: Props) {
  const hoja = useHojaUrl("puesto");
  if (!hoja.abierta) return null;
  const actual = puestos.find((p) => p.id === hoja.valor) ?? null;
  return (
    <Formulario
      key={hoja.valor ?? "x"}
      instalacionId={instalacionId}
      actual={actual}
      cargos={cargos}
      funciones={funciones}
      patrones={patrones}
      onCerrar={hoja.cerrar}
    />
  );
}

function Formulario({
  instalacionId,
  actual,
  cargos,
  funciones,
  patrones,
  onCerrar,
}: {
  instalacionId: string;
  actual: Puesto | null;
  cargos: Props["cargos"];
  funciones: FuncionPuestoOpcion[];
  patrones: PatronTurnoOpcion[];
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [d, setD] = useState(() => inicialPuesto(actual));
  async function guardar() {
    const input = puestoAInput(d);
    const r = await ejecutar(
      actual ? "core.puestos.update" : "core.puestos.create",
      actual ? { id: actual.id, ...input } : { instalacionId, ...input },
    );
    if (r) {
      avisar.exito(`Puesto ${input.nombre} ${actual ? "actualizado" : "creado"}`);
      onCerrar();
    }
  }
  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={actual ? "Editar puesto" : "Nuevo puesto"}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || d.nombre.trim().length < 2 || !d.cargoId || !d.patronId}
            onClick={() => void guardar()}
          >
            {pendiente ? "Guardando…" : actual ? "Guardar" : "Crear puesto"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <CamposPuesto d={d} setD={setD} cargos={cargos} funciones={funciones} patrones={patrones} />
      </div>
    </Sheet>
  );
}

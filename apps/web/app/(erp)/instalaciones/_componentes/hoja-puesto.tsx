"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { FuncionPuestoOpcion, PatronTurnoOpcion, Puesto } from "@/lib/tipos-maestros";

import { CamposPuesto, inicialPuesto, puestoAInput } from "./campos-puesto";
import { EstadoPuesto } from "./estado-puesto";
import { SeccionTitular } from "./seccion-titular";
import type { TitularesPuesto } from "./titular-tipos";

type Props = {
  instalacionId: string;
  /** Instalación · cuenta, para el subtítulo de la hoja (diseño t436u). */
  subtitulo: string;
  puestos: Puesto[];
  cargos: { valor: string; etiqueta: string }[];
  funciones: FuncionPuestoOpcion[];
  patrones: PatronTurnoOpcion[];
  /** true si no se pudieron cargar los catálogos de patrones o funciones (se avisa en la hoja). */
  catalogosError: boolean;
  /** Titulares del puesto abierto (null si Pauta no está activa o no hay permiso de lectura). */
  titulares: TitularesPuesto | null;
  puedeAsignar: boolean;
};

/** Nuevo o editar puesto (09) en Sheet, abierto por `?puesto=nuevo|<id>`. */
export function HojaPuesto({
  instalacionId,
  subtitulo,
  puestos,
  cargos,
  funciones,
  patrones,
  catalogosError,
  titulares,
  puedeAsignar,
}: Props) {
  const hoja = useHojaUrl("puesto");
  if (!hoja.abierta) return null;
  const actual = puestos.find((p) => p.id === hoja.valor) ?? null;
  return (
    <Formulario
      key={hoja.valor ?? "x"}
      instalacionId={instalacionId}
      subtitulo={subtitulo}
      actual={actual}
      cargos={cargos}
      funciones={funciones}
      patrones={patrones}
      catalogosError={catalogosError}
      titulares={titulares?.puestoId === actual?.id ? titulares : null}
      puedeAsignar={puedeAsignar}
      onCerrar={hoja.cerrar}
    />
  );
}

function Formulario({
  instalacionId,
  subtitulo,
  actual,
  cargos,
  funciones,
  patrones,
  catalogosError,
  titulares,
  puedeAsignar,
  onCerrar,
}: {
  instalacionId: string;
  subtitulo: string;
  actual: Puesto | null;
  cargos: Props["cargos"];
  funciones: FuncionPuestoOpcion[];
  patrones: PatronTurnoOpcion[];
  catalogosError: boolean;
  titulares: TitularesPuesto | null;
  puedeAsignar: boolean;
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
      descripcion={subtitulo}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || d.nombre.trim().length < 2 || !d.cargoId || !d.patronId}
            onClick={() => void guardar()}
          >
            {pendiente ? "Guardando…" : actual ? "Guardar cambios" : "Crear puesto"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {catalogosError ? (
          <Alerta tono="danger" titulo="No pudimos cargar los cargos, patrones o funciones">
            Vuelve a entrar a la pestaña. Sin cargo o patrón no se puede crear el puesto.
          </Alerta>
        ) : null}
        {actual && titulares ? (
          <SeccionTitular
            puestoId={actual.id}
            activo={actual.estado === "activo"}
            titulares={titulares}
            puedeAsignar={puedeAsignar}
          />
        ) : null}
        <CamposPuesto d={d} setD={setD} cargos={cargos} funciones={funciones} patrones={patrones} />
        {actual ? <EstadoPuesto puesto={actual} onCerrar={onCerrar} /> : null}
      </div>
    </Sheet>
  );
}

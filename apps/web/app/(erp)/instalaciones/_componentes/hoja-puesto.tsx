"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { FuncionPuestoOpcion, PatronTurnoOpcion, Puesto } from "@/lib/tipos-maestros";

import { CamposPuesto, inicialPuesto, puestoAInput } from "./campos-puesto";

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
};

/** Nuevo o editar puesto (09) en Sheet, abierto por `?puesto=nuevo|<id>`. */
export function HojaPuesto({ instalacionId, subtitulo, puestos, cargos, funciones, patrones, catalogosError }: Props) {
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
  onCerrar,
}: {
  instalacionId: string;
  subtitulo: string;
  actual: Puesto | null;
  cargos: Props["cargos"];
  funciones: FuncionPuestoOpcion[];
  patrones: PatronTurnoOpcion[];
  catalogosError: boolean;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [d, setD] = useState(() => inicialPuesto(actual));
  const [confirmar, setConfirmar] = useState(false);
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
  async function cambiarEstado(estado: "activo" | "inactivo") {
    if (!actual) return;
    const r = await ejecutar("core.puestos.set_estado", { id: actual.id, estado });
    if (r) {
      avisar.exito(estado === "inactivo" ? "Puesto desactivado" : "Puesto reactivado");
      onCerrar();
    }
  }
  const activo = actual?.estado === "activo";
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
          <Alerta tono="danger" titulo="No pudimos cargar los patrones o las funciones">
            Vuelve a entrar a la pestaña. Sin patrón no se puede crear el puesto.
          </Alerta>
        ) : null}
        <CamposPuesto d={d} setD={setD} cargos={cargos} funciones={funciones} patrones={patrones} />
        {actual ? (
          <Button
            variant={activo ? "destructive" : "secondary"}
            block
            disabled={pendiente}
            onClick={() => (activo ? setConfirmar(true) : void cambiarEstado("activo"))}
          >
            {activo ? "Desactivar puesto" : "Reactivar puesto"}
          </Button>
        ) : null}
      </div>
      {confirmar && actual ? (
        <DialogoConfirmar
          confirmacion={{
            titulo: `¿Desactivar «${actual.nombre}»?`,
            descripcion:
              "Dejará de aparecer en la pauta y la persona asignada quedará sin puesto. Podrás reactivarlo cuando quieras.",
            boton: "Desactivar puesto",
            peligro: true,
          }}
          pendiente={pendiente}
          error={error}
          onCerrar={() => setConfirmar(false)}
          onConfirmar={() => void cambiarEstado("inactivo")}
        />
      ) : null}
    </Sheet>
  );
}

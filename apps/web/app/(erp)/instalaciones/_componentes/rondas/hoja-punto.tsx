"use client";

import { useState } from "react";

import { Alerta, Button, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { CentroMapa } from "@/lib/mapa-osm/coords";

import { CamposPunto } from "./campos-punto";
import { inicialPunto } from "./hoja-punto-datos";
import { DialogoArchivarPunto } from "./hoja-punto-dialogo";
import { accionesPuntoHoja } from "./hoja-punto-guardar";
import type { DefectosRondas, Punto } from "./tipos";

/** Nuevo o editar punto de control (c13pd) en Sheet, abierto por `?punto=nuevo|<id>`. */
export function HojaPunto({
  instalacionId,
  puntos,
  defectos,
  centroInstalacion,
}: {
  instalacionId: string;
  puntos: readonly Punto[];
  defectos: DefectosRondas;
  centroInstalacion: CentroMapa;
}) {
  const hoja = useHojaUrl("punto");
  if (!hoja.abierta) return null;
  const actual = puntos.find((p) => p.id === hoja.valor) ?? null;
  return (
    <HojaPuntoForm
      key={hoja.valor ?? "nuevo"}
      instalacionId={instalacionId}
      actual={actual}
      defectos={defectos}
      centroInstalacion={centroInstalacion}
      onCerrar={hoja.cerrar}
    />
  );
}

function HojaPuntoForm(props: {
  instalacionId: string;
  actual: Punto | null;
  defectos: DefectosRondas;
  centroInstalacion: CentroMapa;
  onCerrar: () => void;
}) {
  const { instalacionId, actual, defectos, centroInstalacion, onCerrar } = props;
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [d, setD] = useState(() => inicialPunto(actual, defectos));
  const [confirmar, setConfirmar] = useState(false);
  const { editar, guardar, archivar } = accionesPuntoHoja({
    ejecutar,
    d,
    instalacionId,
    actual,
    onCerrar,
    setConfirmar,
  });
  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={editar && actual ? `Editar punto · ${actual.nombre}` : "Nuevo punto"}
      descripcion="Los valores en blanco heredan los de la empresa (Configuración → Rondas)."
      acciones={
        <>
          {editar && actual?.estado === "activo" ? (
            <Button variant="ghost" onClick={() => setConfirmar(true)}>
              Archivar
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} cargando={pendiente} disabled={d.nombre.trim().length < 2}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <CamposPunto d={d} setD={setD} defectos={defectos} centroInstalacion={centroInstalacion} />
      </div>
      {confirmar && actual ? (
        <DialogoArchivarPunto
          actual={actual}
          pendiente={pendiente}
          error={error}
          onCerrar={() => setConfirmar(false)}
          onConfirmar={archivar}
        />
      ) : null}
    </Sheet>
  );
}
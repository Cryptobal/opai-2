import { Plus } from "lucide-react";

import { Alerta } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";

import { cargarPlantillas, cargarProgramaciones } from "./datos";
import { HojaProgramacion } from "./diferidas";
import { ListaProgramaciones } from "./lista-programaciones";

/** Panel «Programación» (c13s): lista de programaciones y el drawer para fijarlas. */
export async function PanelProgramaciones({
  instalacionId,
  puede,
}: {
  instalacionId: string;
  puede: boolean;
}) {
  const [{ state, programaciones }, plantillasR] = await Promise.all([
    cargarProgramaciones(instalacionId),
    cargarPlantillas(instalacionId),
  ]);
  const activas = plantillasR.plantillas.filter((p) => p.estado === "activo");
  const nueva =
    puede && activas.length > 0 ? (
      <EnlaceBotonHoja href="?programacion=nueva" icono={Plus}>
        Nueva programación
      </EnlaceBotonHoja>
    ) : null;
  return (
    <div className="flex flex-col gap-4">
      {puede && activas.length === 0 ? (
        <Alerta tono="info" titulo="Primero crea una plantilla">
          Una programación ejecuta una plantilla activa de la instalación en los horarios que fijes.
        </Alerta>
      ) : null}
      {programaciones.length > 0 ? <div className="flex justify-end">{nueva}</div> : null}
      <ListaProgramaciones
        state={state}
        programaciones={programaciones}
        plantillas={plantillasR.plantillas}
        accionVacio={nueva}
      />
      {puede ? (
        <HojaProgramacion instalacionId={instalacionId} programaciones={programaciones} plantillas={activas} />
      ) : null}
    </div>
  );
}

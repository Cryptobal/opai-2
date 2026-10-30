import { Plus } from "lucide-react";

import { Alerta } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";

import { cargarPlantillas, cargarPuntos } from "./datos";
import { HojaPlantilla } from "./diferidas";
import { ListaPlantillas } from "./lista-plantillas";

/** Panel «Plantillas» (c13t): lista de plantillas y el drawer para armarlas con sus puntos y tiempos. */
export async function PanelPlantillas({
  instalacionId,
  puede,
}: {
  instalacionId: string;
  puede: boolean;
}) {
  const [{ state, plantillas }, puntosR] = await Promise.all([
    cargarPlantillas(instalacionId),
    cargarPuntos(instalacionId),
  ]);
  const activos = puntosR.puntos.filter((p) => p.estado === "activo");
  const nuevo =
    puede && activos.length > 0 ? (
      <EnlaceBotonHoja href="?plantilla=nueva" icono={Plus}>
        Nueva plantilla
      </EnlaceBotonHoja>
    ) : null;
  return (
    <div className="flex flex-col gap-4">
      {puede && activos.length === 0 ? (
        <Alerta tono="info" titulo="Primero crea puntos de control">
          Una plantilla ordena puntos activos de la instalación. Agrega al menos uno en la pestaña
          Puntos.
        </Alerta>
      ) : null}
      {plantillas.length > 0 ? <div className="flex justify-end">{nuevo}</div> : null}
      <ListaPlantillas state={state} plantillas={plantillas} accionVacio={nuevo} />
      {puede ? (
        <HojaPlantilla instalacionId={instalacionId} plantillas={plantillas} puntos={activos} />
      ) : null}
    </div>
  );
}

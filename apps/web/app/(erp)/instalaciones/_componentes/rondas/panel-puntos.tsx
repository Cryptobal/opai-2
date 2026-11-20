import { Plus } from "lucide-react";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import type { CentroMapa } from "@/lib/mapa-osm/coords";

import { AccionesPuntos } from "./acciones-puntos";
import { cargarDefectos, cargarPuntos } from "./datos";
import { HojaPunto } from "./diferidas";
import { VistaPuntos } from "./mapa/vista-puntos";

/** Panel «Puntos» (c13p): mapa, lista de puntos y el drawer de edición con la herencia visible. */
export async function PanelPuntos({
  instalacionId,
  instalacionNombre,
  centroInstalacion,
  puede,
}: {
  instalacionId: string;
  instalacionNombre: string;
  centroInstalacion: CentroMapa;
  puede: boolean;
}) {
  const [{ state, puntos }, defectos] = await Promise.all([
    cargarPuntos(instalacionId),
    cargarDefectos(),
  ]);
  const nuevo = puede ? (
    <EnlaceBotonHoja href="?punto=nuevo" icono={Plus}>
      Nuevo punto
    </EnlaceBotonHoja>
  ) : null;
  const cabecera =
    puntos.length > 0 ? (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="t-body-sm text-fg-muted">
          {puntos.filter((p) => p.estado === "activo").length} activos de {puntos.length}
        </p>
        <div className="flex flex-none items-center gap-2">
          <AccionesPuntos
            instalacionId={instalacionId}
            instalacionNombre={instalacionNombre}
            puede={puede}
          />
          {nuevo}
        </div>
      </div>
    ) : null;
  return (
    <div className="flex flex-col gap-4">
      <VistaPuntos
        state={state}
        puntos={puntos}
        centro={centroInstalacion}
        defectos={defectos}
        accionVacio={nuevo}
        cabecera={cabecera}
      />
      {puede ? (
        <HojaPunto
          instalacionId={instalacionId}
          puntos={puntos}
          defectos={defectos}
          centroInstalacion={centroInstalacion}
        />
      ) : null}
    </div>
  );
}
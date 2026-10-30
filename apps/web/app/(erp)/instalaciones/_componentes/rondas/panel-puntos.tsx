import { Plus } from "lucide-react";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";

import { AccionesPuntos } from "./acciones-puntos";
import { cargarDefectos, cargarPuntos } from "./datos";
import { HojaPunto } from "./diferidas";
import { ListaPuntos } from "./lista-puntos";

/** Panel «Puntos» (c13p): acciones, lista de puntos y el drawer de edición con la herencia visible. */
export async function PanelPuntos({
  instalacionId,
  instalacionNombre,
  puede,
}: {
  instalacionId: string;
  instalacionNombre: string;
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
  return (
    <div className="flex flex-col gap-4">
      {puntos.length > 0 ? (
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
      ) : null}
      <ListaPuntos state={state} puntos={puntos} accionVacio={nuevo} />
      {puede ? <HojaPunto instalacionId={instalacionId} puntos={puntos} defectos={defectos} /> : null}
    </div>
  );
}

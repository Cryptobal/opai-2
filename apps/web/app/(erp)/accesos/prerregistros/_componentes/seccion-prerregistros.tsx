import type { ReactNode } from "react";

import { diaEnZona } from "@opai/domain";

import { estadoPantalla } from "@/lib/formato";

import { paginacion } from "../../_componentes/paginacion";
import { cargarPrerregistros } from "./datos";
import { ListaPrerregistros } from "./lista-prerregistros";
import { Prerregistrar } from "./prerregistrar";

/** Prerregistros de visitas de la instalación (CAR-478), con «Prerregistrar» para quien puede. */
export async function SeccionPrerregistros({
  instalacion,
  base,
  cursor,
  segmento,
}: {
  instalacion: { id: string; nombre: string };
  base: string;
  cursor: string | undefined;
  segmento: ReactNode;
}) {
  const { r, crea } = await cargarPrerregistros(instalacion.id, cursor);
  const siguiente = r.ok ? r.data.siguiente : null;
  return (
    <div className="flex flex-col gap-3">
      {segmento}
      <ListaPrerregistros
        state={estadoPantalla(r)}
        items={r.ok ? r.data.items : []}
        {...(crea
          ? {
              accion: (
                <Prerregistrar
                  instalaciones={[instalacion]}
                  instalacionId={instalacion.id}
                  hoy={diaEnZona(new Date())}
                />
              ),
            }
          : {})}
        {...paginacion(siguiente && `${base}?sub=prerregistros&cursor=${siguiente}`)}
      />
    </div>
  );
}

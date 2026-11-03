import { PanelActividad } from "@/app/_components/actividad/panel-actividad";
import { itemsDeAuditoria } from "@/app/_components/actividad/sistema";
import type { SearchParams } from "@/lib/parametros";

import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";

export const metadata = { title: "Actividad de la instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Instalación · Actividad (CAR-162): lo registrado a mano más la auditoría de la ficha. */
export default function ActividadInstalacion(props: Props) {
  return (
    <PaginaInstalacion {...props} tab="actividad">
      {async (i, p) => (
        <PanelActividad
          ficha={{
            tipo: "instalacion",
            id: i.id,
            nombre: i.nombre,
            relacionadas: [{ tipo: "cuenta", id: i.cuentaId, nombre: i.cuenta ?? "Cuenta" }],
          }}
          tipo={p["tipo"]}
          base={`/instalaciones/${i.id}/actividad`}
          sistema={await itemsDeAuditoria({ tipo: "instalacion", id: i.id })}
        />
      )}
    </PaginaInstalacion>
  );
}

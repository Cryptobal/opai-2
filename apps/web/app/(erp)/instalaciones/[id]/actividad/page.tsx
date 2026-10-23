import { ActividadFicha } from "@/app/_components/maestros/actividad-ficha";
import type { SearchParams } from "@/lib/parametros";

import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";

export const metadata = { title: "Actividad de la instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

export default function ActividadInstalacion(props: Props) {
  return (
    <PaginaInstalacion {...props} tab="actividad">
      {(i, p) => (
        <ActividadFicha
          entidad={{ tipo: "instalacion", id: i.id }}
          actor={p["actor"]}
          base={`/instalaciones/${i.id}/actividad`}
        />
      )}
    </PaginaInstalacion>
  );
}

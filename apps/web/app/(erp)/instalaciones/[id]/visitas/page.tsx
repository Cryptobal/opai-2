import type { SearchParams } from "@/lib/parametros";

import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";
import { PestanaVisitas } from "../../_componentes/visitas/pestana-visitas";

export const metadata = { title: "Visitas de la instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Tab Visitas (CAR-83): historial de visitas de supervisión de una instalación. */
export default function VisitasInstalacion(props: Props) {
  return (
    <PaginaInstalacion {...props} tab="visitas">
      {(i, p) => <PestanaVisitas instalacionId={i.id} p={p} />}
    </PaginaInstalacion>
  );
}

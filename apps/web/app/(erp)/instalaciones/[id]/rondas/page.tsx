import type { SearchParams } from "@/lib/parametros";

import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";
import { PestanaRondas } from "../../_componentes/rondas/pestana-rondas";

export const metadata = { title: "Rondas de la instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Tab Rondas (Brief 14): puntos, plantillas, programación e historial de una instalación. */
export default function RondasInstalacion(props: Props) {
  return (
    <PaginaInstalacion {...props} tab="rondas">
      {(i, p) => <PestanaRondas instalacionId={i.id} instalacionNombre={i.nombre} sub={p["sub"]} />}
    </PaginaInstalacion>
  );
}

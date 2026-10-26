import type { SearchParams } from "@/lib/parametros";

import { ActividadNegocio } from "../../_componentes/actividad-negocio";
import { PaginaNegocio } from "../../_componentes/pagina-negocio";

export const metadata = { title: "Actividad del negocio" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Negocio · Actividad: cambios de etapa (R11). Notas y tareas llegan en el PR 2. */
export default function ActividadDelNegocio(props: Props) {
  return (
    <PaginaNegocio {...props} tab="actividad">
      {(n) => <ActividadNegocio n={n} />}
    </PaginaNegocio>
  );
}

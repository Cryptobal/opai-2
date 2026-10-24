import type { SearchParams } from "@/lib/parametros";

import { PaginaInstalacion } from "../_componentes/pagina-instalacion";
import { ResumenInstalacion } from "../_componentes/resumen-instalacion";

export const metadata = { title: "Instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Instalación · Resumen en la vista dividida (07); en teléfono, el detalle con "Atrás" (08). */
export default function Instalacion(props: Props) {
  return (
    <PaginaInstalacion {...props} tab="resumen">
      {(i) => <ResumenInstalacion i={i} />}
    </PaginaInstalacion>
  );
}

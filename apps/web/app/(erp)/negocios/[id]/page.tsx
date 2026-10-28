import type { SearchParams } from "@/lib/parametros";

import { PaginaNegocio } from "../_componentes/pagina-negocio";
import { ResumenNegocio } from "../_componentes/resumen-negocio";

export const metadata = { title: "Negocio" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Negocio · Resumen dentro de la vista dividida; en teléfono, el detalle con "Atrás". */
export default function Negocio(props: Props) {
  return (
    <PaginaNegocio {...props} tab="resumen">
      {(n) => <ResumenNegocio n={n} />}
    </PaginaNegocio>
  );
}

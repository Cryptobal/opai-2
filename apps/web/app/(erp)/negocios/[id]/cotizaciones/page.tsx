import type { SearchParams } from "@/lib/parametros";

import { CotizacionesNegocio } from "../../../cotizaciones/_componentes/cotizaciones-negocio";
import { PaginaNegocio } from "../../_componentes/pagina-negocio";

export const metadata = { title: "Cotizaciones del negocio" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

export default function CotizacionesDelNegocio(props: Props) {
  return (
    <PaginaNegocio {...props} tab="cotizaciones">
      {(n, p) => (
        <CotizacionesNegocio
          id={n.id}
          abierto={n.estado === "abierto" && !n.archivadoEn}
          {...(p["cursor"] ? { cursor: p["cursor"] } : {})}
        />
      )}
    </PaginaNegocio>
  );
}

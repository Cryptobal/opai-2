import { Empty } from "@opai/ds";

import type { SearchParams } from "@/lib/parametros";

import { PaginaNegocio } from "../../_componentes/pagina-negocio";

export const metadata = { title: "Cotizaciones del negocio" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Negocio · Cotizaciones: vacío hasta que exista el módulo CPQ (alcance-crm.md §2). */
export default function CotizacionesDelNegocio(props: Props) {
  return (
    <PaginaNegocio {...props} tab="cotizaciones">
      {() => (
        <Empty
          titulo="Cotizaciones con CPQ"
          descripcion="Las cotizaciones del negocio aparecerán aquí cuando se active el módulo CPQ."
        />
      )}
    </PaginaNegocio>
  );
}

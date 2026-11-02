import { PaginaCotizacion } from "../_componentes/pagina-cotizacion";
import { FichaCotizacionLazy } from "./_componentes/ficha-cotizacion-lazy";
import type { SearchParams } from "@/lib/parametros";

export const metadata = { title: "Cotización" };

export default function CotizacionFicha({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  return (
    <PaginaCotizacion params={params} searchParams={searchParams}>
      {(d) => <FichaCotizacionLazy datos={d} />}
    </PaginaCotizacion>
  );
}

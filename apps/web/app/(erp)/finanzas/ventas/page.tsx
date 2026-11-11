import type { SearchParams } from "@/lib/parametros";

import { PaginaVentas } from "./_componentes/pagina-ventas";

export const metadata = { title: "Ventas (DTE)" };

/** Libro de ventas · emisión DTE (CAR-137, diseño Finanzas v3 pantalla 2); maestro-detalle desde CAR-255. */
export default function VentasPage({ searchParams }: { searchParams: SearchParams }) {
  return <PaginaVentas searchParams={searchParams} />;
}

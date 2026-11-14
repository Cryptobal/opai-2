import type { SearchParams } from "@/lib/parametros";

import { PaginaCompras } from "./_componentes/pagina-compras";

export const metadata = { title: "Compras" };

/** Libro de compras (01): documentos recibidos; maestro-detalle desde CAR-256. */
export default function Compras({ searchParams }: { searchParams: SearchParams }) {
  return <PaginaCompras searchParams={searchParams} />;
}
